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
		parse: parse,
		get_data: get_data,
		get_div_id: get_div_id
	}
}()

var BinanceEndpoint = function() {
	var dashboard_table = $('#dashboard-table')
	var init_status = {};
	var ress = ['1m', '1h', '1d']
	var pairs = ['trxeth', 'dnteth', 'xrpeth', 'xmreth', 'zeceth', 'veneth', 'lendeth', 'xlmeth']
	var layout = {
		showlegend: false,
		xaxis: {
			autorange: true,
			type: 'date',
			tickformat: '%a %H:%M'
		},
		yaxis: {
			autorage: true,
			type: 'linear',
			tickformat: ".8f"
		},
		autosize: false,
		width: 600,
		height: 300
	}
	

	var init = function() {
		var socket = new WebSocket('wss://stream.binance.com:9443/stream?streams=trxeth@kline_1m/dnteth@kline_1m')

		socket.onopen = function() {
			console.log('Binance socket successfully opened')
		}

		socket.onclose = function() {
			alert('Binance socket closed. Please refresh this page')
		}

		socket.onmessage = function(msg) {
			update_kline(JSON.parse(msg.data))
		}
	}

	var hash_to_array = function(x) {
		var time = new Array()
		var open = new Array()
		var high = new Array()
		var low = new Array()
		var close = new Array()

		var time_keys = Object.keys(x).sort()

		$.each(time_keys, function(_junk, time_key) {
			var data = x[time_key]

			time.push(new Date(parseInt(time_key)))
			open.push(data.open)
			close.push(data.close)
			high.push(data.high)
			low.push(data.low)
		})

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

		var stream_data = gobble_parser.get_data()
		var resolution = stream_data.resolution
		var pair = stream_data.pair

		if (init_status[resolution] == undefined) {
			init_status[resolution] = {}
		}
		if (init_status[resolution][pair] == undefined) {
			append_dom(gobble_parser.get_div_id())
			init_status[resolution][pair] = {
				init: false,
				data: {}
			}
		}

		var block = init_status[resolution][pair]
		var ptr = block.data

		ptr[timestamp_start] = { open: open, high: high, low: low, close: close }
		var trace = hash_to_array(ptr)

		//console.log(trace)
		//console.log(time_start + ' (+' + delta + '): ' + open + ' | ' + high + ' | ' + low + ' | ' + close)

		if (init_status[resolution] != undefined && init_status[resolution][pair].init) {
			Plotly.purge(gobble_parser.get_div_id())
		} 
		
		Plotly.plot(gobble_parser.get_div_id(), [trace], layout)
		block.init = true
	}

	var append_dom = function(x) {
		dashboard_table
		  .append('<div id=' + x + '></div>')
	}

	return {
		init: init
	}
}()