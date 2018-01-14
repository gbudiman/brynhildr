class DateModulator
	def self.modulus timestamp:
		base_timestamp = timestamp / 86400
		delta_timestamp = timestamp % 86400
		modulus_timestamp = base_timestamp * 86400

		return Time.at(modulus_timestamp).to_datetime.to_i
	end
end