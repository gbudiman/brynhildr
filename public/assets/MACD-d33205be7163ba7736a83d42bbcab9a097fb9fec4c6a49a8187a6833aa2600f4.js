function MACD(close_prices, _timestamps, _period, _stick_length) {
	var stick_length = _stick_length
	var period = _period
	var slice = -(stick_length + period)
	//var slice = -60
	var prices = close_prices.slice(slice)
	var timestamps = _timestamps.slice(slice)
	var last_timestamp = timestamps[timestamps.length - 1]
	var multiplier = 2 / (period + 1)
	var emas = new Array()

	this.compute_ema = function(price) {
		var previous_ema = emas[emas.length - 2]
		return price * multiplier + previous_ema * (1 - multiplier)
	}

	this.precompute_emas = function() {
		for (var i = 0; i < period; i++) {
			emas.push(0)
		}

		for (var i = period; i < prices.length; i++) {
			var previous_ema

			if (i == period) {
				var cusum = 0
				for (var j = i - period; j < period; j++) {
					cusum += parseFloat(prices[j])
				}
				previous_ema = cusum / period
			} else {
				previous_ema = emas[i - 1]
			}

			//console.log(i, previous_ema)
			var ema = prices[i] * multiplier + previous_ema * (1 - multiplier)
			emas.push(ema)
		}

		//console.log(emas)
	}

	this.push = function(price, _timestamp) {
		if (_timestamp != last_timestamp) {
			
			prices.shift()
			prices.push(price)
			timestamps.shift()
			timestamps.push(_timestamp)
			emas.shift()
			emas.push(this.compute_ema(price))

			last_timestamp = _timestamp
		} else {
			prices[prices.length - 1] = parseFloat(price)
			emas[emas.length - 1] = this.compute_ema(parseFloat(price))
		}

		return this.get_emas()
	}

	this.get_emas = function(_slice) {
		var slice = _slice == undefined ? true : false
		return {
			x: timestamps,
			y: this.prepad(slice ? emas.slice(period) : emas),
			type: 'scatter',
			yaxis: 'y',
			xaxis: 'x',
			line: {
				color: period == 7 ? '#B780E3' : '#FFA56B',
				width: 2
			}
		}
	}

	this.get_in_highchart_format = function() {
		var x = timestamps.slice(-1 * stick_length)
		var y = emas.slice(-1 * stick_length)
		var a = new Array()

		for (var i = 0; i < x.length; i++) {
			a.push([x[i], y[i]])
		}

		return a
	}

	this.get_untruncated_emas = function() {
		return this.get_emas(false)
	}

	this.prepad = function(x) {
		if (x.length < stick_length) {
			var fill = x[0]
			var fill_count = stick_length - x.length

			for (var i = 0; i < fill_count; i++) {
				x.unshift(fill)
			}

			return x
		} else {
			return x
		}

	}


	this.precompute_emas()
	return this
}

	

;
