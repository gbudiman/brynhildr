class TaskMaster
	@@tasks = {
		'Bithumb': 1,
		'Coinone': 1,
		'CurrencyLayer': 3600,
		'CurrencyPlacebo': 5,
		'Korbit': 3,
	}

	_e = Exchange
	_o = OneSidedExchange
	_c = CurrencyLayer
	_p = CurrencyPlacebo

	def self.run
		ActiveRecord::Base.logger.level = :error
		threads = []
		self.catch_kill threads: threads
		
		@@tasks.each do |task, period|
			threads << Thread.new { self.fork_fiber task: task, period: period * 1000 }
		end
		
		threads.each { |thread| thread.join }
	end

	def self.catch_kill threads:
		trap('INT') do
			threads.each { |thread| Thread.kill thread}
		end

		ActiveRecord::Base.logger.level = :debug
	end

	def self.time_parent task:, period:
		t0 = Time.now
		yield
		t1 = Time.now

		runtime = (t1 - t0) * 1000
		slack = period - runtime

		sleep(slack / 1000)
	end

	def self.fork_fiber task:, period:
		loop do
			time_parent task: task, period: period do
				Thread.new { self.create_fiber task: task, timestamp: Time.now, period: period }
			end
		end
	end

	def self.create_fiber task:, timestamp:, period:
		begin
			runtime = Object.const_get(task).send(:parse, execute_query: true)

			completion_timestamp = Time.now
			gap = (completion_timestamp - timestamp) * 1000

			s_task = sprintf('%16s', task)
			s_runtime = sprintf('%5.0f', gap)

			if gap < period
				puts "[#{s_task}] [  OK] #{s_runtime}ms"
			else
				puts "[#{s_task}] [FAIL] #{s_runtime}ms"
			end
		rescue SocketError
			puts "[#{s_task}] [ ERR] Socket Error"
		end
	end

	def self.cl_placebo
		task = 'CL Placebo'

		loop do
			runtime = CurrencyLayer.placebo
			sleep_time = 5000 - runtime

			s_task = sprintf('%16s', task)
			s_runtime = sprintf('%5.0f', runtime)
			s_sleep = sprintf('%8.0f', sleep_time)
			puts "[#{s_task}] Executed: #{s_runtime}ms | Slack: #{s_sleep}ms"

			if sleep_time > 0
				sleep(sleep_time / 1000)
			end
		end
	end
end