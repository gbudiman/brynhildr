var Multibox = function() {
	var endpoint_ref
	var box = $('#multibox')

	var get_pairs = function() {
		return ['trxeth', 'ethusdt']
	}

	var init = function(ref) {
		endpoint_ref = ref
		var existing_pairs = $.jStorage.get('pairs')

		if (existing_pairs != undefined) {
			box.selectpicker('val', existing_pairs.map(x => x.toUpperCase()))
			endpoint_ref.init(existing_pairs)
		}
		box.on('changed.bs.select', update_endpoint)
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