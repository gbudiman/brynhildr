class OneSidedExchange
	def self.load_as_json api:
		h = nil
		open(api) do |f|
			h = JSON.parse(f.read)
		end

		return h
	end

	def self.time_it
		time_start = Time.now
		yield
		time_end = Time.now

		diff_msec = (time_end - time_start) * 1000
		return diff_msec
	end

	def self.get_exchange_name
		return self.name
	end
end