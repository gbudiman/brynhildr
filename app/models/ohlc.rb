class Ohlc < ApplicationRecord
	belongs_to :exchange
	belongs_to :expair

	def self.monitor exchange:, pair:
		case exchange
		when :Kraken
			pull_data_kraken exchange: exchange, pair: pair
		when :Bitfinex
			pull_data_bitfinex exchange: exchange, pair: pair
		end
	end

	def self.pull_data_bitfinex exchange:, pair:
		bitfinex_pairs = { 'DASH|USD' => 'DSHUSD',
											 'IOTA|USD' => 'IOTUSD' }

		bf_pair = 't' + (bitfinex_pairs[pair] || pair).gsub(/\|/, '')
		api = URI("https://api.bitfinex.com/v2/candles/trade:1m:#{bf_pair}/hist")
		exchange_id = Exchange.find_by(exchange_name: exchange).id
		pair_id = Expair.find_by(pair_name: pair).id

		ap "[#{Time.now}] Sending request #{exchange} #{pair}..."

		begin
			response = JSON.parse(Net::HTTP.get(api))
			timestamp = Time.now.to_i
			istr = 'INSERT INTO ohlcs (x_timestamp, 
																 exchange_id, expair_id, 
																 x_open, x_close, x_high, x_low,
																 x_volume,
																 created_at, updated_at) VALUES '
			postfix = ' ON CONFLICT DO NOTHING'

			entries = []
			response.each do |a|
				entries.append "(to_timestamp(#{a[0] / 1000}),
												 #{exchange_id}, #{pair_id},
												 #{a[1]}, #{a[2]}, #{a[3]}, #{a[4]},
												 #{a[5]},
												 to_timestamp(#{timestamp}), to_timestamp(#{timestamp}))"
			end
			ActiveRecord::Base.transaction do
				ActiveRecord::Base.connection.execute(istr + entries.join(',') + postfix)
			end
		rescue
			return nil
		end

		return Ohlc.where(exchange_id: exchange_id, expair_id: pair_id).count
	end

	def self.pull_data_kraken exchange:, pair:
		kraken_pairs = { 'XMR|USD' => 'XXMRZUSD',
 									   'BTC|USD' => 'XXBTZUSD',
									   'XRP|USD' => 'XXRPZUSD',
									   'LTC|USD' => 'XLTCZUSD',
									   'ETC|USD' => 'XETCZUSD',
									   'DASH|USD' => 'DASHUSD',
									   'ZEC|USD' => 'XZECZUSD',
									   'BCH|USD' => 'BCHUSD', }
		kraken_pair = kraken_pairs[pair]
		api = URI("https://api.kraken.com/0/public/OHLC?pair=#{kraken_pair}")

		exchange_id = Exchange.find_by(exchange_name: exchange).id
		pair_id = Expair.find_by(pair_name: pair).id
		
		ap "[#{Time.now}] Sending request #{exchange} #{pair}..."
		response = JSON.parse(Net::HTTP.get(api))

		if response['error'].length == 0
			ohlc_data = response['result'][kraken_pair]
			ohlc_last = response['result']['last']
			timestamp = Time.now.to_i

			istr = 'INSERT INTO ohlcs (x_timestamp, 
																 exchange_id, expair_id, 
																 x_open, x_high, x_low, x_close, 
																 x_vwap, x_volume, x_count,
																 created_at, updated_at) VALUES '
			postfix = ' ON CONFLICT DO NOTHING'

			entries = []
			ohlc_data[0..-2].each do |a|
				entries.append "(to_timestamp(#{a[0]}), 
												 #{exchange_id}, #{pair_id}, 
												 #{a[1]}, #{a[2]}, #{a[3]}, #{a[4]}, 
												 #{a[5]}, #{a[6]}, #{a[7]},
												 to_timestamp(#{timestamp}), to_timestamp(#{timestamp}))"
			end

			#ap "Updating records #{exchange} #{pair}..."
			ActiveRecord::Base.transaction do
				ActiveRecord::Base.connection.execute(istr + entries.join(', ') + postfix)
			end
		else
			ap response['error']
			return nil
		end

		return Ohlc.where(exchange_id: exchange_id, expair_id: pair_id).count
	end

	def self.nuke_all!
		ActiveRecord::Base.connection.execute('TRUNCATE ohlcs RESTART IDENTITY')
	end

	def self.get_csv exchange:, pair:
		timestamp = Time.now.utc
		filename = "#{timestamp}_#{exchange}_#{pair}.csv"
		ohlc = Ohlc.joins(:exchange, :expair)
							 .where('exchanges.exchange_name' => exchange)
							 .where('expairs.pair_name' => pair)
							 .select('exchanges.exchange_name AS exchange_name',
							 				 'expairs.pair_name AS pair_name',
							 				 'ohlcs.*')

		as = ['Timestamp, Exchange, Pair, Open, High, Low, Close, Volume']
		ohlc.each do |r|
			a = [r.x_timestamp,
					 r['exchange_name'],
					 r['pair_name'],
					 r['x_open'], r['x_high'], r['x_low'], r['x_close'], r['x_volume']]

			as.push a.join(',')
		end

		File.open(Rails.root.join('dumps', filename), 'w') do |file|
			file.write(as.join("\r\n"))
		end
	end
end
