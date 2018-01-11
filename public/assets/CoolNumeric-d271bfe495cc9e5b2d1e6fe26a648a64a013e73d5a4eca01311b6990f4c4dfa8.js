var CoolNumeric = function() {
	var kmg = ['', 'K', 'M', 'G']

	var get = function(x) {
		if (x == 0) return 0
			
		var tripowers = to_kmg(x)
		var tripower = tripowers.tripower
		var power = tripower * 3

		return (Math.floor(x / (Math.pow(10, power - 1))) / 10)
						 .toFixed(tripower == 0 ? 0 : tripowers.base == 0 ? 1 : 0) 
						 + kmg[tripower]
	}

	var to_kmg = function(x) {
		var lm = Math.log10(x)
		return {
			tripower: parseInt(lm / 3),
			base: parseInt(lm) % 3
		}
	}

	return {
		get: get
	}
}()
;
