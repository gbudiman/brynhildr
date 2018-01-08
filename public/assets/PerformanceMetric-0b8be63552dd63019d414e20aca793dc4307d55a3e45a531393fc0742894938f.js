function PerformanceMetric(pairs) {
	var data = {}

	$.each(pairs, function(_junk, pair) {
		data[pair] = {
			total_delay: 0,
			total_samples: 0,
			is_rendered: true,
			last_render_timestamp: Date.now(),
			drop_count: 0
		}
	})

	this.has_been_rendered = function(pair) {
		// Once called, caller must immediately begin render process
		// as the flag is cleared and timestamped
		var ret = data[pair].is_rendered

		if (ret) {
			data[pair].last_render_timestamp = Date.now()
			data[pair].is_rendered = false
		}

		return ret
	}


	this.complete_render = function(pair, resolution) {
		var p = data[pair]
		var now = Date.now()
		var delta = now - p.last_render_timestamp
		p.is_rendered = true
		p.total_delay += delta
		p.total_samples++

		return p.total_delay / p.total_samples
	}

	this.record_drop = function(pair) {
		data[pair].drop_count++
	}

	this.get_total_delay = function(pair) {
		return data[pair].total_delay
	}

	this.get_total_samples = function(pair) {
		return data[pair].total_samples
	}

	this.get_drop_count = function(pair) {
		return data[pair].drop_count
	}

	return this
}
;
