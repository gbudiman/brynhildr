class Gdax < OneSidedExchange
	@@base_api = 'wss://ws-feed.gdax.com'
	@@quote_currency = 'usd'

	def self.parse execute_query: false
		EM.run do
			ws = WebSocket::EventMachine::Client.connect uri: @@base_api

			ws.onopen do
				msg = {
					type: 'subscribe',
					product_ids: ['ETH-USD', 'BTC-USD', 'BCH-USD', 'LTC-USD'],
					channels: ['ticker']
				}

				ws.send msg.to_json
			end

			ws.onmessage do |msg, type|
				h = JSON.parse(msg)

				if h['type'] == 'ticker' and h['time'] != nil
					SqlMaker.new exchange_name: 'gdax', execute_query: execute_query do |sql|
						datetime = DateModulator.modulus timestamp: Time.new(h['time']).to_i

						base_currency = h['product_id'].split('-')[0].downcase
						price_open = h['open_24h'].to_f
						price_high = h['high_24h'].to_f
						price_low = h['low_24h'].to_f
						price_close = h['price'].to_f
						volume = h['volume_24h'].to_f

						sql.push base_currency: base_currency,
										 quote_currency: @@quote_currency,
										 o: price_open,
										 h: price_high,
										 l: price_low,
										 c: price_close,
										 v: volume,
										 mod: datetime

						TaskMaster.websocket_report exchange: get_exchange_name, task: base_currency
						#ap "Gdax #{base_currency} [OK]"
					end
				end
			end
		end
	end
end