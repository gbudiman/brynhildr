var Periphery = function() {
	var donation = $('#donation')
	var donation_trigger = $('#periphery-donation')
	var help = $('#help')
	var help_trigger = $('#periphery-help')

	var init = function() {
		donation.modal({
			show: false
		})

		help.modal({
			show: false
		}).on('shown.bs.modal', function() {
			var target = $('#help-img')
			var intended_size = target.parent().width()

			target.css('width', intended_size + 'px')
		})

		donation_trigger.on('click', function(event) {
			donation.modal('show')
			event.preventDefault()
		})

		help_trigger.on('click', function(event) {
			help.modal('show')
			event.preventDefault()
		})

		//attach_help_resizer()
	}

	// var attach_help_resizer = function() {
	// 	var resize = function() {
	// 		var target = $('#help-img')
	// 		var intended_size = $(window).width() * 0.67

	// 		target.css('width', intended_size + 'px')
	// 	}
		
	// 	$(window).on('resize', resize);
	// 	resize()
	// }

	return {
		init: init
	}
}()
;
