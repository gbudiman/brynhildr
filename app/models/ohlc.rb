class Ohlc < ApplicationRecord
	def self.monitor exchange:, pair:
		case exchange
		when :Kraken
			pull_data_kraken exchange: exchange, pair: pair
		end
	end

	def self.pull_data_kraken exchange:, pair:
		kraken_pairs = { 'XMR|USD' => 'XXMRZUSD',
 									   'BTC|USD' => 'XXBTZUSD',
									   'XRP|USD' => 'XXRPZUSD',
									   'LTC|USD' => 'XLTCZUSD',
									   'ETC|USD' => 'XETCZUSD',
									   'DASH|USD' => 'DASHUSD',
									   'ZEC|USD' => 'XZECZUSD',
									   'BCH|USD' => 'XBCHZUSD', }
		kraken_pair = kraken_pairs[pair]
		api = URI("https://api.kraken.com/0/public/OHLC?pair=#{kraken_pair}")

		exchange_id = Exchange.find_by(exchange_name: exchange).id
		pair_id = Expair.find_by(pair_name: pair).id
		
		ap "Sending request #{exchange} #{pair}..."
		response = JSON.parse(Net::HTTP.get(api))
		ap "Processing request #{exchange} #{pair}..."

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

			ap "Updating records #{exchange} #{pair}..."
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
end
