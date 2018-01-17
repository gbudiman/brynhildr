var GobbleParser = function() {
	var pattern = /(\w+)\@kline\_(\w+)/
	var pair
	var resolution

	var parse = function(x) {
		var match = pattern.exec(x)
		pair = match[1]
		resolution = match[2]

		return this
	}

	var build = function(_resolution, _pair) {
		pair = _pair
		resolution = _resolution

		return this
	}

	var get_data = function() {
		return {
			pair: pair,
			resolution: resolution
		}
	}

	var get_div_id = function() {
		return 'kline-' + resolution + '-' + pair
	}

	var get_macd_id = function() {
		return 'macd-' + resolution + '-' + pair
	}

	return {
		build: build,
		parse: parse,
		get_data: get_data,
		get_div_id: get_div_id,
		get_macd_id: get_macd_id
	}
}()

var DepthParser = function() {
	var pattern = /(\w+)\@depth/
	var pair

	var parse = function(x) {
		var match = pattern.exec(x)
		pair = match[1]

		return this
	}

	var get_pair = function() { return pair }
	var get_chart_id = function() { return 'depth-chart-' + pair }
	var get_info_id = function() { return 'depth-info-' + pair}

	return {
		parse: parse,
		get_chart_id: get_chart_id,
		get_info_id: get_info_id,
		get_pair: get_pair
	}
}()

var BinanceEndpoint = function() {
	var multibox
	var mod_1h = 3
	var mod_1d = 7
	var stick_limit = 32
	var hard_limit = 100
	var candlestick_queue = {}
	var depth_queue = {}
	var dashboard_table = $('#dashboard-table')
	var init_status = {}
	var init_depth = {}
	var static_klines = {}
	var depths = {}
	var ress = ['1m', '1h', '1d']
	//var pairs = ['ethusdt', 'ltceth', 'trxeth', 'dnteth', 'xrpeth', 'xmreth', 'zeceth', 'veneth', 'lendeth', 'xlmeth']
	var pairs = ['trxeth', 'ethusdt', 'xrpeth', 'ltcbtc']
	var chart_dict = new Array()
	var fiat_pattern = ['eth', 'btc']
	var fiat_compiled = new Array()
	var fiats = { btcusdt: {},
								ethusdt: {} }
	var chart_width = 200
	var chart_height = 80
	var perf_candlestick_1m
	var perf_candlestick_1h
	var perf_candlestick_1d
	var perf_depth
	var pair_info
	var frame_watch
	var dataframes = {}
	var ema7frames = {}
	var ema25frames = {}
	var ema_7
	var ema_25
	var ema_12
	var ema_26
	var ema_delta
	var ema_9
	var message_counts
	var resize_timer = setTimeout(null, 0)
	var candle_socket
	var depth_socket
	var local_ticker = {}
	var equitether_buffer = {}
	
	var attach = function() {
		frame_watch = FrameWatch.init()
		subscribe_to_local_ticker()
		setInterval(function() {
			var fw = frame_watch.get_stats()
			var avg = fw.sum / fw.count
			var t = isNaN(avg) ? '--' : avg.toFixed(0)

			$('#frame-delay').text(t)
			$('#frame-drop').text(fw.drop)
		}, 1000)

		return this
	}

	var register_multibox = function(_multibox) {
		multibox = _multibox
	}

	var register_pair_info = function(d) {
		pair_info = d
	}

	var subscribe_to_local_ticker = function() {
		(function() {
			App.cable.subscriptions.create('TickerChannel', {
				received: function(data) {
					var exchange_name = data.exchange
					local_ticker[data.exchange] = data.data
				}
			})
		}).call(this)
		
	}

	var init = function(init_pairs) {
		destroy_sockets()
		pairs = init_pairs

		$('.rowblock').hide()
		cross_res_pair();
		precompile_regex()
		append_dom()
		var streams = construct_streams()
		
		candle_socket = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams.klines)
		candle_socket.onopen = function() {
			console.log('Binance socket successfully opened')
		}

		candle_socket.onclose = function() {

		}

		candle_socket.onmessage = function(msg) {
			update_kline(JSON.parse(msg.data))
			update_static_kline()
		}

		depth_socket = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams.depths)
		depth_socket.onmessage = function(msg) {
			update_depth(JSON.parse(msg.data))
		}

		var fiat_socket = new WebSocket('wss://stream.binance.com:9443/stream?streams=!ticker@arr')
		fiat_socket.onmessage = function(msg) {
			update_fiats(JSON.parse(msg.data))
		}

		attach_resize()
		chart_width = get_proper_chart_width()
	}

	var destroy_sockets = function() {
		if (candle_socket != undefined) candle_socket.close()
		if (depth_socket != undefined) depth_socket.close()
	}

	var attach_resize = function() {
		$(window).on('resize', function(e) {
			clearTimeout(resize_timer)
			resize_timer = setTimeout(function() {
				resize()
			}, 250)
		})
	}

	var get_proper_chart_width = function() {
		//return ($('.rowblock').width() - 16) / ($(window).width() < 992 ? 2 : 2)
		return ($('.pairtitle').width() / 2)
	}

	var resize = function() {
		setTimeout(function() {
			chart_width = get_proper_chart_width()
			$.each(chart_dict, function(_junk, id) {
				var chart = $('#' + id).highcharts()
				chart.setSize(chart_width, chart_height)
			})
		}, 250)
		
	}

	var cross_res_pair = function() {
		chart_dict = new Array()

		$.each(pairs, function(_junk, pair) {
			chart_dict.push('depth-chart-' + pair)
			$.each(ress, function(_also_junk, res) {
				chart_dict.push('kline-' + res + '-' + pair)
				// if (res == '1m') {
				// 	chart_dict.push('macd-' + res + '-' + pair)
				// }
			})
		})
	}

	var precompile_regex = function() {
		$.each(fiat_pattern, function(_junk, pattern) {
			fiat_compiled.push(new RegExp('(' + pattern + ')$'))
		})
	}

	var construct_streams = function() {
		var streams = new Array()
		var depths = {}
		ema_7 = {}
		ema_25 = {}
		ema_12 = {}
		ema_26 = {}
		ema_delta = {}
		ema_9 = {}
		message_counts = {}
		$.each(ress, function(_junk, resolution) {
			init_status[resolution] = {}
			static_klines[resolution] = {}
			ema_7[resolution] = {}
			ema_25[resolution] = {}
			ema_12[resolution] = {}
			ema_26[resolution] = {}
			ema_delta[resolution] = {}
			ema_9[resolution] = {}
			message_counts[resolution] = {}
			if (candlestick_queue[resolution] == undefined) candlestick_queue[resolution] = {}
			if (dataframes[resolution] == undefined) dataframes[resolution] = {}
			if (ema7frames[resolution] == undefined) ema7frames[resolution] = {}
			if (ema25frames[resolution] == undefined) ema25frames[resolution] = {}

			$.each(pairs, function(_also_junk, pair) {
				var gobble_parser = GobbleParser.build(resolution, pair)
				ema_7[resolution][pair] = null
				ema_25[resolution][pair] = null
				ema_12[resolution][pair] = null
				ema_26[resolution][pair] = null
				ema_delta[resolution][pair] = null
				ema_9[resolution][pair] = null
				message_counts[resolution][pair] = 0

				streams.push(pair + '@kline_' + resolution)
				depths[pair + '@depth20'] = true

				static_klines[resolution][pair] = {}

				get_historical_data(resolution, pair).then(function(data) {
					append_historical_data(resolution, pair, data)
				})
			})
		})

		return {
			klines: streams.join('/'),
			depths: Object.keys(depths).join('/'),
		}
	}

	var update_fiats = function(msgs) {
		$.each(msgs.data, function(_junk, msg) {
			var symbol = msg.s.toLowerCase()

			if (fiats[symbol] != undefined) {
				var ref = fiats[symbol]
				var close = msg.c
				ref.close = close
			}
		})
	}

	var update_depth = function(msg) {
		var depth_header = DepthParser.parse(msg.stream)
		var pair = depth_header.get_pair()
		//console.log(msg)
		//var current_time = new Date(msg.E)
		//var delta = Date.now() - current_time

		// if (delta > 3000) {
		// 	frame_watch.add_dropped()
		// 	return
		// } else {
		// 	frame_watch.add_rendered(delta)
		// }

		var bids = msg.data.bids
		var asks = msg.data.asks

		var ask_cum = 0
		var ask_depth = { x:[], y:[] }
		$.each(asks, function(_junk, ask) {
			var x_point = parseFloat(ask[0])
			var y_point = parseFloat(ask[1])
			ask_cum += y_point

			ask_depth.x.push(x_point)
			ask_depth.y.push(ask_cum)
		})

		var bid_cum = 0
		var bid_depth = { x:[], y:[] }
		$.each(bids, function(_junk, bid) {
			var x_point = parseFloat(bid[0])
			var y_point = parseFloat(bid[1])
			bid_cum += y_point

			bid_depth.x.push(x_point)
			bid_depth.y.push(bid_cum)
		})

		var ask_trace = {
			x: ask_depth.x,
			y: ask_depth.y,
			fill: 'tozeroy',
			type: 'scatter',
			line: {color: '#DC4C48'}
		}
		var bid_trace = {
			x: bid_depth.x.reverse(),
			y: bid_depth.y.reverse(),
			fill: 'tozeroy',
			type: 'scatter',
			line: {color: '#49A862'}
		}

		var hi_ask_trace = ask_trace.x.map(function(e, i) { return [e, ask_trace.y[i]] })
		var hi_bid_trace = bid_trace.x.map(function(e, i) { return [e, bid_trace.y[i]] })


		var min_range = bids[0][0]
		var max_range = asks[asks.length - 1][0]
		var z_data = [bid_trace, ask_trace]

		$('#' + depth_header.get_info_id() + '-min').text(min_range)
		$('#' + depth_header.get_info_id() + '-max').text(max_range)
		//depth_layout.width = chart_width

		if (init_depth[pair]) {
			var chart = $('#' + depth_header.get_chart_id()).highcharts()
			chart.series[0].setData(hi_bid_trace)
			chart.series[1].setData(hi_ask_trace)
		} else {
			Highcharts.stockChart(depth_header.get_chart_id(), {
				chart: {
					backgroundColor: '#333',
					height: chart_height,
					spacing: [4,4,4,4],
					style: {
						fontFamily: 'Exo'
					},
					width: get_proper_chart_width()
				},
				credits: false,
				legend: { enabled: false },
				navigator: { enabled: false },
				rangeSelector: { enabled: false },
				scrollbar: { enabled: false },
				series: [{
					data: hi_bid_trace,
					fillColor: 'rgba(73, 168, 98, 0.5)',
					lineColor: '#49A862',
					type: 'area',
					yAxis: 0
				}, {
					borderWidth: 0,
					data: hi_ask_trace,
					fillColor: 'rgba(220, 76, 72, 0.5)',
					lineColor: '#DC4C48',
					type: 'area',
					yAxis: 0
				}],
				tooltip: { enabled: false },
				xAxis: {
					labels: {
						enabled: false
					},
					gridLineWidth: 1,
					gridLineColor: '#555',
					tickWidth: 0
				},
				yAxis: [{
					labels: {
						enabled: true,
						style: {
							color: '#eee'
						}
					},
					gridLineWidth: 1,
					gridLineColor: '#555',
					tickPixelInterval: chart_height / 4
				}, {
					labels: {
						enabled: false
					}
				}]
			})

			init_depth[pair] = true
		}
	}

	var update_kline = function(_msg) {
		var gobble_parser = GobbleParser.parse(_msg.stream)
		var stream_data = gobble_parser.get_data()
		var resolution = stream_data.resolution
		var pair = stream_data.pair

		var msg = _msg.data
		var timestamp_start = parseInt(msg.k.t)
		var time_start = new Date(msg.k.t)
		var current_time = new Date(msg.E)

		// check if lagging behind by more than 8s
		// don't waste time processing backlogged data
		
		if (Date.now() - current_time > 8000) {
			frame_watch.add_dropped()
			// simply trigger fetch for historical data
			// and set queue flag to true
			if (candlestick_queue[resolution][pair] == undefined ||
					candlestick_queue[resolution][pair] == false) {
				candlestick_queue[resolution][pair] = true
				get_historical_data(resolution, pair).then(function(data) {
					append_historical_data(resolution, pair, data)
				})
			}

			return
		}


		if (candlestick_queue[resolution][pair]) {
			if (Date.now() - current_time < 3000) {
				// once lag is less than 3s, disable flag
				candlestick_queue[resolution][pair] = false
			} else {
				frame_watch.add_dropped()
				// as long as the queue flag is true, code returns here, saving time
				return
			}
		}


		//}
		var delta = parseInt((msg.E - msg.k.t) / 1000)
		var open = parseFloat(msg.k.o)
		var close = parseFloat(msg.k.c)
		var high = parseFloat(msg.k.h)
		var low = parseFloat(msg.k.l)
		var trades = msg.k.n

		var dataframe = dataframes[resolution][pair]

		if (dataframe == undefined || dataframe.length == 0) {
			//Historical data is not loaded yet, wait
			console.log(_msg.stream + ' dropped because historical data not loaded yet')
			return
		}

		static_klines[resolution][pair] = {
			open: open,
			close: close,
			trades: trades
		}

		var last_entry = dataframe[dataframe.length - 1]
		var last_timestamp = last_entry[0]
		var chart = $('#kline-' + resolution + '-' + pair).highcharts()
		
		
		var e7 = ema7frames[resolution][pair]
		var e25 = ema25frames[resolution][pair]
		e7.push(close, timestamp_start)
	 	e25.push(close, timestamp_start)

	 	var time_delta = Date.now() - current_time
		if (last_timestamp == timestamp_start) {
			last_entry[4] = close
			if (time_delta < 3000) {
				frame_watch.add_rendered(time_delta)
				render_chart(chart, time_delta, dataframe, e7, e25)
			} else {
				frame_watch.add_dropped()
			}
		} else {
			dataframe.push([timestamp_start, open, high, low, close])
			dataframe.shift()

			frame_watch.add_rendered(time_delta)
			render_chart(chart, time_delta, dataframe, e7, e25)
		}

		write_usdt_equivalent(pair, close)	
		update_local_ticker(pair)
	}

	var update_local_ticker = function(pair) {
		// console.log(pair)
		// var p_bithumb = local_ticker['bithumb']
		// var p_coinone = local_ticker['coinone']
		var l_pairs = {
			bithumb: local_ticker['bithumb'],
			coinone: local_ticker['coinone']
		}

		var l_test = l_pairs.bithumb
		var base_currency = pair.slice(0, 3)

		if (l_test[pair.slice(0, 3)] == undefined) {
			base_currency = pair.slice(0, 4)
			if (l_test[pair.slice(0, 4)] == undefined) {
				base_currency = pair.slice(0, 5)
			}
		} 

		

		$.each(l_pairs, function(exchange, data) {
			var d = l_pairs[exchange]
			if (data[base_currency] == undefined) return true
			var ohlc = l_pairs[exchange][base_currency]
			var close_buffer = 0

			$.each(['open', 'high', 'low', 'close'], function(_junk, x) {
				var base_dom_id = '#local-' + pair + '-' + x + '-' + exchange
				var value = ohlc[x]
				var forex_value = local_ticker['currency_layer']['krw']

				value /= forex_value

				if (!isNaN(value)) {
					if (x == 'close') close_buffer = value
					$(base_dom_id).text('$' + value.toFixed(2))
				}
			})

			if (close_buffer > 0 && equitether_buffer[pair] != undefined) {
				var dom_margin = '#local-' + pair + '-margin-' + exchange
				var x_margin = (close_buffer - equitether_buffer[pair]) / equitether_buffer[pair]
				$(dom_margin).text((x_margin * 100).toFixed(2) + '%')

				if (x_margin > 0) {
					$(dom_margin).addClass('bg-positive').removeClass('bg-negative')
				} else {
					$(dom_margin).addClass('bg-negative').removeClass('bg-positive')
				}
			}
		})

		
	}

	var render_chart = function(chart, delta, xframe, e7, e25) {
		chart.series[0].setData(xframe)
		chart.series[1].setData(e7.get_in_highchart_format())
		chart.series[2].setData(e25.get_in_highchart_format())
	}

	var write_usdt_equivalent = function(pair, close) {
		var fiat_pair = get_fiat_quote_pair(pair)
		var write_target = $('#tether-' + pair)
		var text_out = null

		if (fiat_pair) {
			var fiat_tether = fiats[fiat_pair + 'usdt']
			var equi_tether = close * fiat_tether.close

			if (!isNaN(equi_tether)) {
				equitether_buffer[pair] = close * fiat_tether.close
				text_out = equi_tether.toFixed(2)
			}
		} else {
			equitether_buffer[pair] = close
		}

		
		write_target.text(text_out == null ? '' : '$' + text_out)
		$('#closevalue-' + pair).text(close)
	}

	var emas_elementwise_subtract = function(mid, slow) {
		var vals = new Array()
		for (var i = 0; i < mid.length; i++) {
			vals.push(mid[i] - slow[i])
		}

		return vals
	}

	var render_delay = function(pair) {
		var num = get_multi_resolution_delay(pair).toFixed(0)

		if (isNaN(num)) {
			num = '--'
		} else {
			num += 'ms'
		}
		//$('#delay-' + pair).text(num + ' (' + get_total_drops(pair) + ' drop)')
		$('#delay-' + pair).text(num)
	}

	var get_multi_resolution_delay = function(pair) {
		var delays = perf_candlestick_1m.get_total_delay(pair)
							 + perf_candlestick_1d.get_total_delay(pair)
							 + perf_candlestick_1h.get_total_delay(pair)
		var samples = perf_candlestick_1m.get_total_samples(pair)
								+ perf_candlestick_1h.get_total_samples(pair)
								+ perf_candlestick_1d.get_total_samples(pair)

		return delays / samples
	}

	var get_total_drops = function(pair) {
		return perf_candlestick_1m.get_drop_count(pair)
				 + perf_candlestick_1h.get_drop_count(pair)
				 + perf_candlestick_1d.get_drop_count(pair)
	}

	var update_static_kline = function() {
		$.each(static_klines, function(resolution, rdata) {
			$.each(rdata, function(pair, pdata) {
				var movement = $('#' + resolution + '-' + pair + '-movement')
				var volume_el = $('#' + resolution + '-' + pair + '-volume')
				var pctg = $('#pctg-' + resolution + '-' + pair)
				var open = pdata.open

				if (open == undefined) {
					movement.text('Fetching stream...')
					pctg.text('...')
					volume_el.text('...')
				} else {
					var close = pdata.close
					var diff = (close - open) / open * 100
					var volume = CoolNumeric.get(pdata.trades)

					movement.text(resolution + ': ' + open)
					volume_el.text(volume)
					pctg.text(diff.toFixed(2) + '%')
					var dp = pctg

					if (diff < 0) {
						pctg.addClass('negative')
						dp.removeClass('bg-positive').addClass('bg-negative')
					} else {
						pctg.removeClass('negative')
						dp.addClass('bg-positive').removeClass('bg-negative')
					}
				}
			})
		})
	}

	var append_dom = function() {
		var colfig = 'colfig col-xs-12'
		var s = ''

	
		$.each(pairs, function(_junk, pair) {
			if ($('#cell-' + pair).length != 0) {
				$('#cell-' + pair).show()
				return true
			}

			var base_pair = pair_info[pair].base
			var quote_pair = pair_info[pair].quote
			s += '<div class="rowblock col-xs-12 col-md-6 col-lg-4" id="cell-' + pair + '">'
		    +    '<div class="colfig col-xs-12">'
				+      '<div class="col-xs-12 colfig pairtitle">'
				+        '<span class="pairname">' + base_pair.toUpperCase() + '</span>'
				+        '<span class="pairname pairquote">/' + quote_pair.toUpperCase() + '</span>'
				+        '<span class="glyphicon glyphicon-remove pairname" data-pair="' + pair + '" />'
				+        '<div class="pull-right">'
				+    			 '<span class="currentprice" id="closevalue-' + pair + '"></span>'
				+          '<span class="equiprice" id="tether-' + pair + '" />'
				+        '</div>'
				
				+      '</div>'
				+      '<div class="col-xs-6 colfig">'
				+        '<div class="col-xs-12 colfig" id="depth-chart-' + pair + '" />'				
				+        '<div class="col-xs-12 colfig">'
				+          '<span id="depth-info-' + pair + '-max" class="pull-right" />'
				+          '<span id="depth-info-' + pair + '-min" />'
				+        '</div>'


			$.each(ress, function(_also_junk, res) {
				//s +=     '<div class="col-xs-12 colfig header-span" id="pctg-' + res + '-' + pair + '"/>'
				s +=     '<div class="col-xs-12 colfig">'
					+        '<span id="' + res + '-' + pair + '-movement" class="static-kline"/>'
					+        '<span id="' + res + '-' + pair + '-volume" class="static-kline bold volume"/>'
					+        '<span id="pctg-' + res + '-' + pair + '" class="pull-right static-kline bold" />'
					+      '</div>'
			})

			// s +=       '<div class="col-xs-12 colfig">'
			// 	+          '<span class="static-kline">USDT Equivalent</span>'
			//   +    			 '<span class="static-kline bold pull-right" id="tether-' + pair + '"/>'
			//   +        '</div>'
			// s +=        '<div class="col-xs-12 colfig">'
			//   +          '<span class="static-kline">Delay</span>'
			//   +          '<span class="static-kline pull-right" id="delay-' + pair + '"/>'
			//   +        '</div>'
			s +=       '<div class="col-xs-2 colfig" />'
			  +        '<div class="col-xs-5 colfig">Bithumb</div>'
			  +        '<div class="col-xs-5 colfig">Coinone</div>'
			  +        '<div class="col-xs-2 colfig">O</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-open-bithumb">--</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-open-coinone">--</div>'
			  +        '<div class="col-xs-2 colfig">H</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-high-bithumb">--</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-high-coinone">--</div>'			  
			  +        '<div class="col-xs-2 colfig">L</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-low-bithumb">--</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-low-coinone">--</div>'			  
			  +        '<div class="col-xs-2 colfig">C</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-close-bithumb">--</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-close-coinone">--</div>'			  
			  +        '<div class="col-xs-2 colfig">M</div>'
			  // +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-volume-bithumb">--</div>'
			  // +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-volume-coinone">--</div>'			  
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-margin-bithumb">--</div>'
			  +        '<div class="col-xs-5 colfig local-ticker" id="local-' + pair + '-margin-coinone">--</div>'
			  +      '</div>'
				+      '<div class="col-xs-6 colfig">'
				
			$.each(ress, function(_also_junk, res) {
				s	+=     '<div class="col-xs-12 colfig" id="kline-' + res + '-' + pair + '" />'
				if (res == '1m') {
				s +=     '<div class="col-xs-12 colfig" id="macd-' + res + '-' + pair + '" />'
				}
			})
			s +=     '</div>'
			s +=   '</div>'
			s += '</div>'
		})
		

		dashboard_table.append(s)
		$('.glyphicon-remove.pairname').off('click').on('click', function() {
			multibox.unhook($(this).attr('data-pair').toUpperCase())
		})
	}

	var append_historical_data = function(resolution, pair, data) {
		//var anchor = init_status[resolution][pair].data
		dataframes[resolution][pair] = new Array()
		var anchor = dataframes[resolution][pair]
		var ema_feed = new Array()
		var ema_key = new Array()

		$.each(data, function(_junk, d) {
			var time_key = parseInt(d[0])
			var open = parseFloat(d[1])
			var high = parseFloat(d[2])
			var low = parseFloat(d[3])
			var close = parseFloat(d[4])
			var volume = d[5]
			var trades = d[6]

			//anchor[time_key] = { open: open, high: high, low: low, close: close }
			anchor.push([time_key, open, high, low, close])
			ema_feed.push(close)
			ema_key.push(time_key)
		})

		// ema_7[resolution][pair] = new MACD(ema_feed, ema_key, 7, stick_limit)
		// ema_25[resolution][pair] = new MACD(ema_feed, ema_key, 25, stick_limit)
		// ema_12[resolution][pair] = new MACD(ema_feed, ema_key, 12, stick_limit)
		// ema_26[resolution][pair] = new MACD(ema_feed, ema_key, 26, stick_limit)

		// var ue12 = ema_12[resolution][pair].get_untruncated_emas()
		// var ue26 = ema_26[resolution][pair].get_untruncated_emas()

		//console.log(ema_12[resolution][pair].get_untruncated_emas().y)
		//console.log(ema_26[resolution][pair].get_untruncated_emas().y)

		// var delta = emas_elementwise_subtract(ue12.y, ue26.y)
		// var sliced_key = ema_key.slice(ue12.y.length * -1)

		// ema_delta[resolution][pair] = new MACD(delta, ema_key, 9, stick_limit)
		// ema_9[resolution][pair] = new MACD(ema_delta[resolution][pair].get_untruncated_emas().y, 
		// 																	 sliced_key, 9, stick_limit)
		//console.log(ema_9[resolution][pair].get_untruncated_emas().y)

		//candlestick_queue[resolution][pair] = true
		dataframes[resolution][pair] = dataframes[resolution][pair].slice(-1 * stick_limit)
		ema7frames[resolution][pair] = new MACD(ema_feed, ema_key, 7, stick_limit)
		ema25frames[resolution][pair] = new MACD(ema_feed, ema_key, 25, stick_limit)

		// if (resolution == '1d') {
		// 	console.log(dataframes[resolution][pair])
		// 	console.log(ema7frames[resolution][pair].get_in_highchart_format())
		// }

		var m_ohlc = min_max_ohlc(dataframes[resolution][pair])
		//console.log(m_ohlc)

		Highcharts.stockChart('kline-' + resolution + '-' + pair, {
			chart: {
				backgroundColor: '#333',
				height: chart_height,
				width: get_proper_chart_width(),
				spacing: [0,0,0,0],
				//marginRight: -4,
				style: {
					fontFamily: 'Exo'
				}
			},
			credits: false,
			legend: {
				enabled: false
			},
			navigator: {
				enabled: false
			},
			rangeSelector: {
				enabled: false
			},
			scrollbar: {
				enabled: false
			},
			series: [{
				type: 'candlestick',
				data: dataframes[resolution][pair],
				color: '#DC4C48',
				upColor: '#49A862',
				lineColor: '#DC4C48',
				upLineColor: '#49A862',
				dataGrouping: {
					forced: true
				},
				//pointWidth: 4,
				//groupPadding: 0.01,
				//pointPadding: 0.01,
				//softThreshold: true,
				yAxis: 0
			}, {
				data: ema7frames[resolution][pair].get_in_highchart_format(),
				yAxis: 0,
				lineColor: '#FFA56B',
				lineWidth: 2
			}, {
				data: ema25frames[resolution][pair].get_in_highchart_format(),
				yAxis: 0,
				lineColor: '#B780E3',
				lineWidth: 2
			}],
			tooltip: { enabled: false },
			xAxis: {
				lineColor: '#555',
				lineWidth: 0,
				gridLineWidth: 1,
				gridLineColor: '#555',
				tickColor: '#555',
				tickWidth: 0,
				labels: {
					formatter: function() {
						switch(resolution) {
							case '1m': return moment(this.value).format('H:mm'); break
							case '1h': return moment(this.value).format('ddd A'); break
							case '1d': return moment(this.value).format('M/D'); break
						}
					},
					style: {
						color: '#eee'
					}
				}
			}, 
			yAxis: [{
				labels: {
					enabled: false
				},
				lineColor: '#555',
				gridLineWidth: 1,
				gridLineColor: '#555',
				endOnTick: false,
				startOnTick: false,
				//tickAmount: 64
				tickPixelInterval: chart_height / 4
			}]
		})
	}

	var get_timestamp_format = function(res) {
		switch(res) {
			case '1m': return '%H:%M'
			case '1h': return '%a %p'
			case '1d': return '%m/%d'
		}
	}

	var min_max_ohlc = function(a) {
		var anchor_min = 999999
		var anchor_max = 0

		for (var i = 0; i < a.length; i++) {
			for (var j = 1; j < a[i].length; j++) {
				var val = a[i][j]

				if (val < anchor_min) anchor_min = val
				if (val > anchor_max) anchor_max = val
			}
		}

		return {
			min: anchor_min,
			max: anchor_max
		}
	}

	var get_fiat_quote_pair = function(pair) {
		var match_found = false;
		$.each(fiat_compiled, function(_junk, compiled) {
			var match = pair.match(compiled)
			if (match) {
				match_found = match[1]
				return false
			}
		}) 

		return match_found
	}

	var get_historical_data = function(resolution, pair) {
		var core_func = function() {

			return new Promise(function(resolve, reject) {
				$.ajax({
					crossDomain: true,
					type: 'GET',
					//url: 'https://api.binance.com/api/v1/klines',
					url: '/preload_candlestick',
					data: {
						interval: resolution,
						symbol: pair.toUpperCase()
					}
				}).done(function(res) {
					resolve(res)
				}).fail(function() {
					console.log('get_historical_data failure. Retrying...')
					resolve(core_func())
				})
			})
		}

		return core_func()
	}

	return {
		attach: attach,
		register_multibox: register_multibox,
		register_pair_info: register_pair_info,
		init: init
	}
}()
;
