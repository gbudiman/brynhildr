var Multibox = function() {
	var endpoint_ref
	var box = $('#multibox')
	var well = $('#welcome-well')
	var pair_info = {}

	var get_exchange_pairs = function() {
		return new Promise(function(resolve, reject) {
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

					pair_info[sdata.symbol.toLowerCase()] = {
						base: sdata.baseAsset,
						quote: sdata.quoteAsset
					}
				})

				box.empty()
				var s = ''
				$.each(trading_symbols.sort(), function(_junk, symbol) {
					s += '<option>' + symbol + '</symbol>'
				})
				box.append(s)
				box.selectpicker('refresh')

				endpoint_ref.register_pair_info(pair_info)
				resolve(true)
			})
		})
	}

	var init = function(ref) {
		endpoint_ref = ref
		well.text('Handshaking with exchange...')
		
		get_exchange_pairs().then(function() {
			box.on('changed.bs.select', update_endpoint)
			var existing_pairs = $.jStorage.get('pairs')

			if (existing_pairs != undefined) {
				box.selectpicker('val', existing_pairs.map(x => x.toUpperCase()))
				endpoint_ref.init(existing_pairs, pair_info)
				well.hide()
			} else {
				well.text('Please select trading pairs from the top right box').show()
			}
		})
		return this
	}

	var update_endpoint = function() {
		var pairs = box.selectpicker('val')
		if (pairs != null) {
			pairs = pairs.map(x => x.toLowerCase()).sort()
			well.hide()
		} else {
			well.text('Please select trading pairs from the top right box').show()
		}

		$.jStorage.set('pairs', pairs)
		endpoint_ref.init(pairs)
	}

	var unhook = function(pair_to_remove) {
		var new_pairs = box.selectpicker('val').filter(x => x != pair_to_remove)
		box.selectpicker('val', new_pairs)
		box.trigger('changed.bs.select')
	}

	return {
		init: init,
		unhook: unhook
	}
}()
;
