class CurrencyLayer < OneSidedExchange
	@@key = ENV['CURRENCY_LAYER_KEY']
	@@base_api = "http://apilayer.net/api/live?access_key=#{@@key}"
	@@base_currency = 'usd'
	@@exchange_name = 'currency_layer'

	def self.parse execute_query: false
		time_it do
			h = load_as_json api: @@base_api

			SqlMaker.new exchange_name: @@exchange_name, execute_query: execute_query do |sql|
				datetime = DateModulator.modulus(timestamp: h['timestamp'].to_i)
				h['quotes'].each do |sixcurr, val|
					quote_currency = sixcurr[3..-1].downcase
					price_close = val.to_f

					sql.push base_currency: @@base_currency,
									 quote_currency: quote_currency,
									 c: price_close,
									 mod: datetime
				end
			end
		end
	end

	def self.placebo
		time_it do
			websocket_message = {
				data: self.generate_message,
				exchange: @@exchange_name
			}

			ActionCable.server.broadcast 'ticker_channel', websocket_message
		end
	end

	def self.generate_message
		h = {}
		Dailydatum.joins(:exchange)
							.where('exchanges.exchange_name' => @@exchange_name)
							.where('dailydata.modulus_timestamp' => Time.at(DateModulator.modulus(timestamp: Time.now.to_i)).to_datetime)
							.select('quote_currency, close')
							.each do |r|
			h[r['quote_currency']] = r['close']
		end

		return h
	end
end