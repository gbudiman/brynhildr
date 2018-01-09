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
	var stick_limit = 48
	var hard_limit = 100
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
	var chart_height = 75
	var perf_candlestick_1m
	var perf_candlestick_1h
	var perf_candlestick_1d
	var perf_depth
	var pair_info
	var ema_7
	var ema_25
	var ema_12
	var ema_26
	var ema_delta
	var ema_9
	var message_counts
	var linecolor = '#555'
	var tickfont = {
		family: 'Exo, sans-serif',
		size: 11,
		color: '#eee'
	}
	var layout = {
		showlegend: false,
		margin: {
			l: 8, r: 8, b: 16, t: 0, pad: 0
		},
		xaxis: {
			autorange: true,
			type: 'date',
			showgrid: true,
			showticklabels: true,
			rangeslider: {
				visible: false
			},
			fixedrange: true,
			tickfont: tickfont,
			gridcolor: linecolor
		},
		yaxis: {
			autorage: true,
			type: 'linear',
			//tickformat: ".8f"
			showticklabels: false,
			fixedrange: true,
			gridcolor: linecolor
		},
		yaxis2: {
			overlaying: 'y',
			showgrid: false,
			showticklabels: false,
			autorange: true,
			fixedrange: true
		},
		autosize: false,
		width: chart_width,
		height: chart_height,
		hovermode: false,
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
	}
	var macd_layout = {
		showlegend: false,
		margin: {
			l: 8, r: 8, b: 0, t: 0, pad: 0
		},
		xaxis: {
			autorange: true,
			type: 'date',
			fixedrange: true,
			gridcolor: linecolor
		},
		yaxis: {
			autorange: true,
			fixedrange: true,
			gridcolor: linecolor,
			showgrid: false
		},
		// yaxis2: {
		// 	overlaying: 'y',
		// 	showgrid: false,
		// 	fixedrange: true,
		// 	autorange: true
		// },
		autosize: false,
		width: chart_width,
		height: chart_height / 4,
		hovermode: false,
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)'
	}
	var depth_layout = {
		showlegend: false,
		margin: {
			l: 32, r: 0, b: 8, t: 8, pad: 0
		},
		xaxis: {
			fixedrange: true,
			autorange: true,
			showticklabels: false,
			gridcolor: linecolor
		},
		yaxis: {
			fixedrange: true,
			autorange: true,
			tickfont: tickfont,
			gridcolor: linecolor
		},
		autosize: false,
		width: chart_width,
		height: chart_height,
		hovermode: false,
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
	}
	var candle_socket
	var depth_socket
	
	var attach = function() {
		return this
	}

	var register_multibox = function(_multibox) {
		multibox = _multibox
	}

	var register_pair_info = function(d) {
		pair_info = d
	}

	var init = function(init_pairs) {
		destroy_sockets()
		pairs = init_pairs
		perf_depth = new PerformanceMetric(pairs)
		perf_candlestick_1m = new PerformanceMetric(pairs)
		perf_candlestick_1h = new PerformanceMetric(pairs)
		perf_candlestick_1d = new PerformanceMetric(pairs)

		$('.rowblock').hide()
		cross_res_pair();
		precompile_regex()
		append_dom()
		var streams = preload_historical_data()
		
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
		$(window).on('resize', resize)
	}

	var get_proper_chart_width = function() {
		return ($('.rowblock').width() - 8) / ($(window).width() < 992 ? 2 : 2)
	}

	var resize = function() {
		chart_width = get_proper_chart_width()
		$.each(chart_dict, function(_junk, id) {
			Plotly.relayout(id, { width: chart_width })
		})
	}

	var cross_res_pair = function() {
		chart_dict = new Array()

		$.each(pairs, function(_junk, pair) {
			chart_dict.push('depth-chart-' + pair)
			$.each(ress, function(_also_junk, res) {
				chart_dict.push('kline-' + res + '-' + pair)
				if (res == '1m') {
					chart_dict.push('macd-' + res + '-' + pair)
				}
			})
		})
	}

	var precompile_regex = function() {
		$.each(fiat_pattern, function(_junk, pattern) {
			fiat_compiled.push(new RegExp('(' + pattern + ')$'))
		})
	}

	var preload_historical_data = function() {
		init_depth = {}
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
				init_status[resolution][pair] = {
					init: false,
					data: {}
				}
				init_depth[pair] = false

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

	var hash_to_array = function(x) {
		var time = new Array()
		var open = new Array()
		var high = new Array()
		var low = new Array()
		var close = new Array()

		var time_keys = Object.keys(x).sort()

		$.each(time_keys.slice(-1 * stick_limit), function(_junk, time_key) {
			var data = x[time_key]

			time.push(new Date(parseInt(time_key)))
			open.push(data.open)
			close.push(data.close)
			high.push(data.high)
			low.push(data.low)
		})

		if (time_keys.length > hard_limit) delete x[time_keys[0]]

		return {
			x: time,
			close: close,
			high: high,
			low: low,
			open: open,
			type: 'candlestick',
			xaxis: 'x',
			yaxis: 'y',
			increasing: { line: {color: '#49A862'}},
			decreasing: { line: {color: '#DC4C48' }}
		}
	}

	var update_depth = function(msg) {
		var depth_header = DepthParser.parse(msg.stream)
		var pair = depth_header.get_pair()

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

		var min_range = bids[0][0]
		var max_range = asks[asks.length - 1][0]

		// console.log('bids')
		// console.log(bid_trace)
		// console.log('asks')
		// console.log(ask_trace)
		var z_data = [bid_trace, ask_trace]
		//console.log(z_data)

		$('#' + depth_header.get_info_id() + '-min').text(min_range)
		$('#' + depth_header.get_info_id() + '-max').text(max_range)
		depth_layout.width = chart_width

		if (init_depth[pair]) {
			if (perf_depth.has_been_rendered(pair) == false) {
				perf_depth.record_drop(pair)
				console.log('Dropping message ' + msg.stream)
				return
			}
			// Plotly.purge(depth_header.get_chart_id())
			// Plotly.plot(depth_header.get_chart_id(), 
			// 						z_data, 
			// 						depth_layout, {displayModeBar: false}).then(function() {
			var gdiv = depth_header.get_chart_id()
			Plotly.restyle(gdiv, 'x', [bid_trace.x, ask_trace.x]).then(function() {
				Plotly.restyle(gdiv, 'y', [bid_trace.y, ask_trace.y]).then(function() {
					perf_depth.complete_render(pair)
					render_delay(pair)
				})
			})
		} else {
			Plotly.plot(depth_header.get_chart_id(), 
									z_data, 
									depth_layout, {displayModeBar: false}).then(function() {
				perf_depth.complete_render(pair)
			})
			init_depth[pair] = true
		}
	}

	var update_kline = function(_msg) {
		var gobble_parser = GobbleParser.parse(_msg.stream)
		var stream_data = gobble_parser.get_data()
		var resolution = stream_data.resolution
		var pair = stream_data.pair
		var update_plot = true

		message_counts[resolution][pair]++
		switch(resolution) {
			case '1h':
				if (message_counts[resolution][pair] % mod_1h != 0) {
					update_plot = false
				}
				break;
			case '1d':
				if (message_counts[resolution][pair] % mod_1d != 0) {
					update_plot = false
				}
				break;
		}

		var msg = _msg.data
		var timestamp_start = parseInt(msg.k.t)
		var time_start = new Date(msg.k.t)
		var current_time = new Date(msg.E)
		var delta = parseInt((msg.E - msg.k.t) / 1000)
		var open = msg.k.o
		var close = msg.k.c
		var high = msg.k.h
		var low = msg.k.l
		var trades = msg.k.n
		var perf_pointer

		

		var block = init_status[resolution][pair]
		var ptr = block.data

		ptr[timestamp_start] = { open: open, high: high, low: low, close: close }
		var trace = hash_to_array(ptr)

		static_klines[resolution][pair] = {
			open: open,
			close: close,
			trades: trades
		}

		//console.log(trace)
		//console.log(time_start + ' (+' + delta + '): ' + open + ' | ' + high + ' | ' + low + ' | ' + close)
		switch(resolution) {
			case '1m': 
				//macd_fast[resolution][pair].push(close, timestamp_start)
				//console.log(macd_fast[resolution][pair].get_timestamps())
				
				perf_pointer = perf_candlestick_1m
				layout.xaxis.tickformat = '%H:%M'; break;
			case '1h': 
				//macd_fast['1h'][pair].push(close, timestamp_start)
				perf_pointer = perf_candlestick_1h
				layout.xaxis.tickformat = '%a %p'; break;
			case '1d': 
				//macd_fast['1d'][pair].push(close, timestamp_start)
				perf_pointer = perf_candlestick_1d
				layout.xaxis.tickformat = '%m/%d'; break;
		}


		var e7 = ema_7[resolution][pair].push(close, timestamp_start)
		var e25 = ema_25[resolution][pair].push(close, timestamp_start)
		var e12 = ema_12[resolution][pair].push(close, timestamp_start)
		var e26 = ema_12[resolution][pair].push(close, timestamp_start)
		//var ed = ema_delta[resolution][pair].push(e12.y[e12.y.length - 1] - e26.y[e26.y.length - 1])
		var ed = emas_elementwise_subtract(e7.y, e25.y)
		//var e9 = ema_9[resolution][pair].push(ed.y[ed.y.length - 1])

		layout.width = chart_width
		macd_layout.width = chart_width
		if (update_plot) {
			//console.log(Date.now() + ': update ' + _msg.stream)
		} else {
			//console.log(Date.now() + ': skipping ' + _msg.stream)
		}

		if (update_plot) {
			if (init_status[resolution][pair].init) {
				if (perf_pointer.has_been_rendered(pair) == false) {
					perf_pointer.record_drop()
					console.log('Dropping message ' + _msg.stream)
					return
				}

				//console.log(Date.now() + ': BEGIN RENDER ' + _msg.stream)

				// $.when(Plotly.restyle(gobble_parser.get_div_id(), 'open', [trace.open]),
				// 			 Plotly.restyle(gobble_parser.get_div_id(), 'high', [trace.high]),
				// 			 Plotly.restyle(gobble_parser.get_div_id(), 'low', [trace.low]),
				// 			 Plotly.restyle(gobble_parser.get_div_id(), 'close', [trace.close]),
				// 			 Plotly.restyle(gobble_parser.get_div_id(), 'x', [trace.x]),
				// 			 Plotly.restyle(gobble_parser.get_div_id(), 'y', [e7.y, e25.y]))
				// 			 //Plotly.restyle(gobble_parser.get_macd_id(), 'x', [ed.x]),
				// 			 //Plotly.restyle(gobble_parser.get_macd_id(), 'y', [ed.y, e9.y]))
				// 	.done(function() {
				// 	// if (resolution == '1m') {
				// 	// 	Plotly.restyle(gobble_parser.get_macd_id(), 'x', [trace.x])
				// 	// 	Plotly.restyle(gobble_parser.get_macd_id(), 'y', [ed])
				// 	// 	Plotly.restyle(gobble_parser.get_macd_id(), 'marker.color', [ed.map(v => v > 0 ? '#49a862' : '#dc4c48')])
				// 	// 	Plotly.restyle(gobble_parser.get_macd_id(), 'marker.color', ed.map(v => v > 0 ? '#49a862' : '#dc4c48'))
				// 	// }
				// 	perf_pointer.complete_render(pair)
				// 	render_delay(pair)
				// 	console.log(Date.now() + ': COMPLETE RENDER ' + _msg.stream)
				// })
				var gdiv = gobble_parser.get_div_id()
				e7.x = trace.x
				e25.x = trace.x
				Plotly.restyle(gdiv, 'open', [trace.open]).then(function() {
					Plotly.restyle(gdiv, 'high', [trace.high]).then(function() {
						Plotly.restyle(gdiv, 'low', [trace.low]).then(function() {
							Plotly.restyle(gdiv, 'close', [trace.close]).then(function() {
								Plotly.restyle(gdiv, 'x', [trace.x]).then(function() {
									Plotly.restyle(gdiv, 'y', [e7.y, e25.y]).then(function() {
										perf_pointer.complete_render(pair)
										render_delay(pair)
										//console.log(Date.now() + ': COMPLETE RENDER ' + _msg.stream)
									})
								})
							})
						})
					})
				})
			} else {
				e7.x = trace.x//e7.x.slice(-1 * stick_limit)
				e25.x = trace.x//e25.x.slice(-1 * stick_limit)

				Plotly.plot(gobble_parser.get_div_id(), [trace, e7, e25], layout, {displayModeBar: false}).then(function() {
					perf_pointer.complete_render(pair)
					//console.log('First instantiation delay ' + _msg.stream + ': ' + avg_delay + ' ms')
				})
				// if (resolution == '1m') {
				// 	var ed_data = {
				// 		x: e7.x,
				// 		y: ed,
				// 		type: 'bar',
				// 		marker: {
				// 			color: ed.map(v => v > 0 ? '#49a862' : '#dc4c48')
				// 		}
				// 	}
				// 	Plotly.plot(gobble_parser.get_macd_id(), [ed_data], macd_layout, {displayModeBar: false})
				// }
				init_status[resolution][pair].init = true
			}
		}
		
		write_usdt_equivalent(pair, close)
	}

	var write_usdt_equivalent = function(pair, close) {
		var fiat_pair = get_fiat_quote_pair(pair)
		var write_target = $('#tether-' + pair)
		var text_out = null

		if (fiat_pair) {
			var fiat_tether = fiats[fiat_pair + 'usdt']
			var equi_tether = close * fiat_tether.close

			if (!isNaN(equi_tether)) {
				text_out = equi_tether.toFixed(2)
			}
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
					var volume = pdata.trades

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
			s += '<div class="rowblock col-xs-12 col-md-6" id="cell-' + pair + '">'
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
			s +=        '<div class="col-xs-12 colfig">'
			  +          '<span class="static-kline">Delay</span>'
			  +          '<span class="static-kline pull-right" id="delay-' + pair + '"/>'
			  +        '</div>'
			s	+=     '</div>'
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
		var anchor = init_status[resolution][pair].data
		var ema_feed = new Array()
		var ema_key = new Array()

		$.each(data, function(_junk, d) {
			var time_key = d[0]
			var open = d[1]
			var high = d[2]
			var low = d[3]
			var close = d[4]
			var volume = d[5]
			var trades = d[6]

			anchor[time_key] = { open: open, high: high, low: low, close: close }
			ema_feed.push(close)
			ema_key.push(time_key)
		})

		ema_7[resolution][pair] = new MACD(ema_feed, ema_key, 7, stick_limit)
		ema_25[resolution][pair] = new MACD(ema_feed, ema_key, 25, stick_limit)
		ema_12[resolution][pair] = new MACD(ema_feed, ema_key, 12, stick_limit)
		ema_26[resolution][pair] = new MACD(ema_feed, ema_key, 26, stick_limit)

		var ue12 = ema_12[resolution][pair].get_untruncated_emas()
		var ue26 = ema_26[resolution][pair].get_untruncated_emas()

		//console.log(ema_12[resolution][pair].get_untruncated_emas().y)
		//console.log(ema_26[resolution][pair].get_untruncated_emas().y)

		var delta = emas_elementwise_subtract(ue12.y, ue26.y)
		var sliced_key = ema_key.slice(ue12.y.length * -1)

		ema_delta[resolution][pair] = new MACD(delta, ema_key, 9, stick_limit)
		ema_9[resolution][pair] = new MACD(ema_delta[resolution][pair].get_untruncated_emas().y, 
																			 sliced_key, 9, stick_limit)
		//console.log(ema_9[resolution][pair].get_untruncated_emas().y)
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
