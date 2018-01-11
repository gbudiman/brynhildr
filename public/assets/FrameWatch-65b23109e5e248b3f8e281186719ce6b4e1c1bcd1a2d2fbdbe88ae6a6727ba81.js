var FrameWatch = function() {
	var frame_sum
	var frame_count
	var frame_drop

	var init = function() {
		frame_sum = 0
		frame_count = 0
		frame_drop = 0
		return this
	}

	var add_dropped = function() {
		frame_drop++
	}

	var add_rendered = function(x) {
		frame_sum += parseInt(x)
		frame_count++
	}

	var get_stats = function() {
		return {
			sum: frame_sum,
			count: frame_count,
			drop: frame_drop
		}
	}

	return {
		init: init,
		add_rendered: add_rendered,
		add_dropped: add_dropped,
		get_stats: get_stats
	}
}()
;
