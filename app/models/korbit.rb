class Korbit < OneSidedExchange
	@@base_api = 'https://api.korbit.co.kr/v1/ticker/detailed?currency_pair='
	@@quote_currency = 'krw'

	def self.parse execute_query: false
		time_it do
			['btc', 'eth'].each do |base|
				h = load_as_json api: "#{@@base_api}#{base}_#{@@quote_currency}"

				SqlMaker.new exchange_name: 'korbit', execute_query: execute_query do |sql|
					datetime = DateModulator.modulus timestamp: h['timestamp'].to_i
					base_currency = base
					price_high = h['high'].to_f
					price_low = h['low'].to_f
					price_close = h['last'].to_f
					volume = h['volume'].to_f

					sql.push base_currency: base_currency,
									 quote_currency: @@quote_currency,
									 o: 0,
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