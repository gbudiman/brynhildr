class Bithumb
	@@base_api = 'https://api.bithumb.com/public/ticker/all'
	@@quote_currency = 'krw'
	@@exchange_id = Exchange.where(exchange_name: 'bithumb').first.id

	def self.parse
		h = nil
		q = []
		open(@@base_api) do |f|
			h = JSON.parse(f.read)
		end
		now = Time.now.to_i

		if h['status'] == '0000'
			datetime = DateModulator.modulus timestamp: h['data']['date'].to_i / 1000
			h['data'].each do |uc_currency, data|
				if data['opening_price'] == nil then next end

				base_currency = uc_currency.downcase	
				price_open = data['opening_price'].to_f
				price_high = data['max_price'].to_f
				price_low = data['min_price'].to_f
				price_close = data['closing_price'].to_f
				volume = data['volume_1day'].to_f

				q.push('(' + ["'#{base_currency}'", "'#{@@quote_currency}'", "to_timestamp(#{datetime})",
										 price_open, price_high, price_low, price_close, 
										 volume, @@exchange_id, 
										 "to_timestamp(#{now})", "to_timestamp(#{now})",
										 ].join(', ') + ')')
			end
		end

		sql = 'INSERT INTO dailydata AS d(base_currency, quote_currency, modulus_timestamp, ' \
			  +                            'open, high, low, close, volume, exchange_id, ' \
        +                            'created_at, updated_at) VALUES ' + q.join(', ') + ' '\
        +   'ON CONFLICT (exchange_id, base_currency, quote_currency, modulus_timestamp) DO UPDATE ' \
        +      'SET close = excluded.close, volume = excluded.volume, updated_at = excluded.updated_at'

		ActiveRecord::Base.connection.execute(sql)
	end
end