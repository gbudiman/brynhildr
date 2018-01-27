class CurrencyPlacebo < CurrencyLayer
	def self.parse execute_query: false
		time_it do
			message = self.generate_message
			websocket_message = {
				data: message[:data],
				exchange: @@exchange_name,
				timestamp: message[:timestamp]
			}

			ActionCable.server.broadcast 'ticker_channel', websocket_message
		end
	end

	def self.generate_message
		h = {}
		hts = Dailydatum.joins(:exchange)
										.where('exchanges.exchange_name' => @@exchange_name)
										.maximum(:modulus_timestamp)
		hx = nil

		Dailydatum.joins(:exchange)
							.where('exchanges.exchange_name' => @@exchange_name)
							.where('dailydata.modulus_timestamp' => hts)
							.select('quote_currency, close, exchanges.updated_at AS xts')
							.each do |r|
			h[r['quote_currency']] = r['close']
			hx = r['xts']
		end

		return {
			data: h,
			timestamp: hx
		}
	end
end