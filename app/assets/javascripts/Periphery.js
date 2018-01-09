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
		})

		donation_trigger.on('click', function(event) {
			donation.modal('show')
			event.preventDefault()
		})

		help_trigger.on('click', function(event) {
			help.modal('show')
			event.preventDefault()
		})
	}

	return {
		init: init
	}
}()