class TaskMaster
	@@tasks = {
		'Bithumb': 1,
		'Coinone': 1,
		'CurrencyLayer': 3600
	}

	def self.run
		threads = []
		self.catch_kill threads: threads
		
		@@tasks.each do |task, period|
			threads << Thread.new { self.create_fiber task: task, period: period * 1000 }
		end

		threads.each { |thread| thread.join }


	end

	def self.catch_kill threads:
		trap('INT') do
			threads.each { |thread| Thread.kill thread}
		end
	end

	def self.create_fiber task:, period:
		loop do
			runtime = Object.const_get(task).send(:parse, execute_query: true)
			sleep_time = period - runtime

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