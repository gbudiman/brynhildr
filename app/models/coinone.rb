class Coinone < OneSidedExchange
	@@base_api = 'https://api.coinone.co.kr/ticker?currency=all'
	@@quote_currency = 'krw'

	def self.parse execute_query: false
		time_it do
			h = load_as_json api: @@base_api

			SqlMaker.new exchange_name: 'coinone', execute_query: execute_query do |sql|
				datetime = DateModulator.modulus timestamp: h['timestamp'].to_i
				h.each do |uc_currency, data|
					if data['volume'] == nil then next end

						base_currency = uc_currency.downcase
						price_open = data['first'].to_f
						price_high = data['high'].to_f
						price_low = data['low'].to_f
						price_close = data['last'].to_f
						volume = data['volume'].to_f

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