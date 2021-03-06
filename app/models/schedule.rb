class Schedule
	@@exchange_cycle = 600 # 10 minutes
	@@pair_cycle = 10 # 10 seconds per currency pair
	@@retry_delay = 10 # 10 seconds delay for each failed pull

	def initialize
		@sdata = {
			Kraken: {
				pairs: ['XMR|USD', 'BTC|USD', 'XRP|USD', 
								'LTC|USD', 'ETC|USD', 'DASH|USD', 
								'ZEC|USD', 'BCH|USD']
			},
			Bitfinex: {
				pairs: ['XMR|USD', 'BTC|USD', 'XRP|USD', 
								'LTC|USD', 'ETC|USD', 'DASH|USD', 
								'ZEC|USD', 'BCH|USD', 'IOTA|USD']
			},
			HitBTC: {
				pairs: ['XMR|USD', 'BTC|USD', 'XRP|USD', 
								'LTC|USD', 'ETC|USD', 'DASH|USD', 
								'ZEC|USD', 'BCH|USD']
			}
		}

		@base_time = Time.now.to_i
		@threads = []
		ActiveRecord::Base.logger = nil

		ap '###############################################'
		ap '#                                             #'
		ap '#   Brynhildr Scheduler                       #'
		ap '#                                             #'
		ap '###############################################'

		@sdata.each do |exchange, _junk|
			t = Thread.new { spawn_monitor exchange: exchange }
			@threads.push t
		end

		@threads.each do |t|
			t.join
		end
	end

	def spawn_monitor exchange:
		pairs = @sdata[exchange][:pairs]
		time_offset = @sdata[exchange][:time_offset]

		mthreads = []

		loop do 
			pairs.each_with_index do |pair, i|
				m = Thread.new { spawn_submonitor exchange: exchange, 
																					pair: pair,
																					time_offset: @@pair_cycle * i }
				mthreads.push m
			end

			ap "Finished creating pair threads for #{exchange}"
			sleep(@@exchange_cycle)
			mthreads.each do |m|
				m.join
			end
		end
	end

	def spawn_submonitor exchange:, pair:, time_offset:
		sleep(time_offset)

		loop do
			res = Ohlc.monitor(exchange: exchange, pair: pair)

			if res != nil 
				ap "[#{Time.now}] Update success: #{exchange} #{pair} -> #{res} records total"
				break
			else
				ap "[#{Time.now}] Update FAILED: #{exchange} #{pair}. Retrying in 10 seconds..."
				sleep(@@retry_delay)
			end
		end
	end
end
