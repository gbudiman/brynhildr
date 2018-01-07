var Multibox = function() {
	var endpoint_ref
	var box = $('#multibox')

	var get_pairs = function() {
		return ['trxeth', 'ethusdt']
	}

	var get_exchange_pairs = function() {
		$.ajax({
			method: 'GET',
			url: '/exchange_info'
		}).done(function(res) {
			var symbols = res.symbols
			var trading_symbols = new Array()

			$.each(symbols, function(_junk, sdata) {
				if (sdata.status == 'TRADING') {
					trading_symbols.push(sdata.symbol)
				}
			})

			box.empty()
			var s = ''
			$.each(trading_symbols.sort(), function(_junk, symbol) {
				s += '<option>' + symbol + '</symbol>'
			})
			box.append(s)
			box.selectpicker('refresh')

			var existing_pairs = $.jStorage.get('pairs')

			if (existing_pairs != undefined) {
				box.selectpicker('val', existing_pairs.map(x => x.toUpperCase()))
				endpoint_ref.init(existing_pairs)
			}
		})
	}

	var init = function(ref) {
		endpoint_ref = ref
		
		box.on('changed.bs.select', update_endpoint)

		get_exchange_pairs()
		return this
	}

	var update_endpoint = function() {
		var pairs = box.selectpicker('val')
		if (pairs != null) {
			pairs = pairs.map(x => x.toLowerCase()).sort()
		}

		$.jStorage.set('pairs', pairs)
		endpoint_ref.init(pairs)
	}

	return {
		get_pairs: get_pairs,
		init: init
	}
}()