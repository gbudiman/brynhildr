class Bithumb
	@@base_api = 'https://api.bithumb.com/public/ticker/all'
	@@quote_currency = 'krw'
	
	def self.parse
		h = nil
		open(@@base_api) do |f|
			h = JSON.parse(f.read)
		end

		SqlMaker.new exchange_name: 'bithumb' do |sql|
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

					sql.push base_currency: base_currency,
									 quote_currency: @@quote_currency,
									 o: price_open,
									 h: price_high,
									 l: price_low,
									 c: price_close,
									 v: volume,
									 mod: datetime
				end
			end
		end
	end
end