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

var BinanceEndpoint = function() {
	var stick_limit = 32
	var dashboard_table = $('#dashboard-table')
	var init_status = {};
	var static_klines = {}
	var ress = ['1m', '1h', '1d']
	var last_latch = {}
	var pairs = ['trxeth', 'dnteth', 'xrpeth', 'xmreth', 'zeceth', 'veneth', 'lendeth', 'xlmeth']
	//var pairs = ['trxeth', 'dnteth', 'xrpeth']
	var layout = {
		showlegend: false,
		margin: {
			l: 0, r: 0, b: 16, t: 0, pad: 0
		},
		xaxis: {
			autorange: true,
			type: 'date',
			showgrid: true,
			showticklabels: true,
			rangeslider: {
				visible: false
			}
		},
		yaxis: {
			autorage: true,
			type: 'linear',
			//tickformat: ".8f"
			showticklabels: false
		},
		autosize: false,
		width: 300,
		height: 150,
		dragmode: 'pan'
	}
	

	var init = function() {
		append_dom()
		var streams = preload_historical_data()
		var socket = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams)
		socket.onopen = function() {
			console.log('Binance socket successfully opened')
		}

		socket.onclose = function() {
			alert('Binance socket closed. Please refresh this page')
		}

		socket.onmessage = function(msg) {
			update_kline(JSON.parse(msg.data))
			update_static_kline()
		}
	}

	var preload_historical_data = function() {
		var streams = new Array()

		$.each(ress, function(_junk, resolution) {
			init_status[resolution] = {}
			static_klines[resolution] = {}

			$.each(pairs, function(_also_junk, pair) {
				var gobble_parser = GobbleParser.build(resolution, pair)
				streams.push(pair + '@kline_' + resolution)
				last_latch[pair] = null

				static_klines[resolution][pair] = {}
				init_status[resolution][pair] = {
					init: false,
					data: {}
				}

				get_historical_data(resolution, pair).then(function(data) {
					append_historical_data(resolution, pair, data)
				})
			})
		})

		return streams.join('/')
	}

	var hash_to_array = function(x) {
		var time = new Array()
		var open = new Array()
		var high = new Array()
		var low = new Array()
		var close = new Array()

		var time_keys = Object.keys(x).sort()

		$.each(time_keys.slice(1), function(_junk, time_key) {
			var data = x[time_key]

			time.push(new Date(parseInt(time_key)))
			open.push(data.open)
			close.push(data.close)
			high.push(data.high)
			low.push(data.low)
		})

		if (time_keys.length > stick_limit) delete x[time_keys[0]]

		return {
			x: time,
			close: close,
			high: high,
			low: low,
			open: open,
			type: 'candlestick',
			xaxis: 'x',
			yaxis: 'y'
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

		Plotly.purge(gobble_parser.get_div_id())
		Plotly.plot(gobble_parser.get_div_id(), [trace], layout, {displayModeBar: false})
	}

	var update_static_kline = function() {
		$.each(static_klines, function(resolution, rdata) {
			$.each(rdata, function(pair, pdata) {
				var movement = $('#' + resolution + '-' + pair + '-movement')
				var open = pdata.open

				if (open == undefined) {
					movement.text('Fetching stream...')
				} else {
					var close = pdata.close
					var diff = (close - open) / open * 100
					var volume = pdata.trades
					//var volume = $('#' + resolution + '-' + pair + '-volume')

					movement.text(open + ' -> ' + close + ' (' + diff.toFixed(2) + '%) [' + volume + ']')
				}
			})
		})
	}

	var append_dom = function(x) {
		var s = ''

		$.each(pairs, function(_junk, pair) {
			s += '<div class="col-xs-12" id="row-' + pair + '">'
				+    '<div class="col-xs-12">' + pair.toUpperCase() + '</div>'

			$.each(ress, function(_junk, res) {
				s += '<div class="col-xs-4" id="' + res + '-' + pair + '-movement"></div>'
				//s += '<div class="col-xs-4" id="' + res + '-' + pair + '-volume"></div>'
			})
			
			$.each(ress, function(_junk, res) {
				s += '<div class="col-xs-4" id="kline-' + res + '-' + pair + '"></div>'
			})		
			s += '</div>'
		})

		dashboard_table.append(s)
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

	var get_historical_data = function(resolution, pair) {
		return new Promise(function(resolve, reject) {
			$.ajax({
				type: 'GET',
				url: 'https://api.binance.com/api/v1/klines',
				data: {
					interval: resolution,
					symbol: pair.toUpperCase(),
					limit: stick_limit
					}
				}).done(function(res) {
					resolve(res)
				})
			})
		}

	return {
		init: init
	}
}()