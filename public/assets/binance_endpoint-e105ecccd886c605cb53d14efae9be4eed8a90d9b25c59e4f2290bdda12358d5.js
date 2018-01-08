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

	return {
		build: build,
		parse: parse,
		get_data: get_data,
		get_div_id: get_div_id
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
	var stick_limit = 32
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
	var fiat_pattern = ['eth', 'btc', 'ltc']
	var fiat_compiled = new Array()
	var fiats = { btcusdt: {},
								ethusdt: {} }
	var chart_width = 200
	var chart_height = 75
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
		autosize: false,
		width: chart_width,
		height: chart_height,
		hovermode: false,
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
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

	var init = function(init_pairs) {
		destroy_sockets()
		pairs = init_pairs
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
		return ($('.rowblock').width() - 32) / ($(window).width() < 992 ? 2 : 2)
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
		$.each(ress, function(_junk, resolution) {
			init_status[resolution] = {}
			static_klines[resolution] = {}

			$.each(pairs, function(_also_junk, pair) {
				var gobble_parser = GobbleParser.build(resolution, pair)
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
		var pair = depth_header.pair

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
			x: bid_depth.x,
			y: bid_depth.y,
			fill: 'tozeroy',
			type: 'scatter',
			line: {color: '#49A862'}
		}

		var min_range = bids[0][0]
		var max_range = asks[asks.length - 1][0]

		$('#' + depth_header.get_info_id() + '-min').text(min_range)
		$('#' + depth_header.get_info_id() + '-max').text(max_range)
		depth_layout.width = chart_width
		Plotly.purge(depth_header.get_chart_id())
		if (init_depth[pair]) {
			Plotly.plot(depth_header.get_chart_id(), [ask_trace, bid_trace], depth_layout, {displayModeBar: false})
		} else {
			Plotly.restyle(depth_header.get_chart_id(), [ask_trace, bid_trace])
			init_depth[pair] = true
		}
	}

	var update_kline = function(_msg) {
		var gobble_parser = GobbleParser.parse(_msg.stream)

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

		var stream_data = gobble_parser.get_data()
		var resolution = stream_data.resolution
		var pair = stream_data.pair

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
			case '1m': layout.xaxis.tickformat = '%H:%M'; break;
			case '1h': layout.xaxis.tickformat = '%a'; break;
			case '1d': layout.xaxis.tickformat = '%m/%d'; break;
		}

		layout.width = chart_width
		if (init_status[resolution][pair].init) {
			Plotly.restyle(gobble_parser.get_div_id(), 'open', [trace.open])
			Plotly.restyle(gobble_parser.get_div_id(), 'high', [trace.high])
			Plotly.restyle(gobble_parser.get_div_id(), 'low', [trace.low])
			Plotly.restyle(gobble_parser.get_div_id(), 'close', [trace.close])
			Plotly.restyle(gobble_parser.get_div_id(), 'x', [trace.x])
		} else {
			Plotly.plot(gobble_parser.get_div_id(), [trace], layout, {displayModeBar: false})
			init_status[resolution][pair].init = true
		}

		$('#closevalue-' + pair).text(close)

		var fiat_pair = get_fiat_quote_pair(pair)
		if (fiat_pair) {
			var fiat_tether = fiats[fiat_pair + 'usdt']

			var equi_tether = close * fiat_tether.close
			if (!isNaN(equi_tether)) {
				$('#tether-' + pair).text('$' + equi_tether.toFixed(2))
			} else {
				$('#tether-' + pair).text('Calculating...')
			}
		} else if (fiats[pair] != undefined) {
			var val = fiats[pair].close

			if (!isNaN(val)) {
				$('#tether-' + pair).text('$' + parseFloat(val).toFixed(2))
			} else {
				$('#tether-' + pair).text('Calculating...')
			}
		} else {
			if (!isNaN(close)) {
				$('#tether-' + pair).text('$' + parseFloat(close).toFixed(2))
			} else {
				$('#tether-' + pair).text('Calculating...')
			}
		}
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

	var append_dom = function(x) {
		var colfig = 'colfig col-xs-12'
		var s = ''
	
		$.each(pairs, function(_junk, pair) {
			if ($('#cell-' + pair).length != 0) {
				$('#cell-' + pair).show()
				return true
			}
			s += '<div class="rowblock col-xs-12 col-md-6" id="cell-' + pair + '">'
		    +    '<div class="colfig col-xs-12">'
				+      '<div class="col-xs-12 colfig pairtitle">'
				+        '<span class="pairname">' + pair.toUpperCase() + '</span>'
				+        '<span class="glyphicon glyphicon-remove pairname" data-pair="' + pair + '" />'
				+  			 '<span class="currentprice pull-right" id="closevalue-' + pair + '">...</span>'
				
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

			s +=       '<div class="col-xs-12 colfig">'
				+          '<span class="static-kline">USDT Equivalent</span>'
			  +    			 '<span class="static-kline bold pull-right" id="tether-' + pair + '"/>'
			  +        '</div>'
			s	+=     '</div>'
				+      '<div class="col-xs-6 colfig">'
				
			$.each(ress, function(_also_junk, res) {
				s	+=     '<div class="col-xs-12 colfig" id="kline-' + res + '-' + pair + '" />'
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

		$.each(data, function(_junk, d) {
			var time_key = d[0]
			var open = d[1]
			var high = d[2]
			var low = d[3]
			var close = d[4]
			var volume = d[5]
			var trades = d[6]

			anchor[time_key] = { open: open, high: high, low: low, close: close }
		})
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
		init: init
	}
}()
;