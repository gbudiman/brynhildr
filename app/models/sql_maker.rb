class SqlMaker
	@@template_prefix = 'INSERT INTO dailydata AS d(base_currency, quote_currency, '\
																								 'modulus_timestamp, ' \
																								 'open, high, low, close, volume, '\
																								 'exchange_id, '\
																								 'created_at, updated_at) VALUES '
	@@template_postfix = ' ON CONFLICT (exchange_id, ' \
												  					 'base_currency, quote_currency, modulus_timestamp) ' \
												  					 'DO UPDATE ' \
  												 	 				 'SET close = excluded.close, ' \
	  											 	 				     'volume = excluded.volume, ' \
		  											 				     'updated_at = excluded.updated_at'
 
	def initialize exchange_name:, execute_query:
		@exchange_name = exchange_name
		@exchange_id = Exchange.where(exchange_name: exchange_name).first.id
		@q = []
		@last_mod

		yield self

		if execute_query then self.exec end
	end

	def push base_currency:, quote_currency:, o: 0, h: 0, l: 0, c:, v: 0, mod:
		now = Time.now.to_i
		@last_mod = mod
		@q.push('(' + ["'#{base_currency}'", "'#{quote_currency}'", 
									 "to_timestamp(#{mod})", o, h, l, c, v, @exchange_id,
									 "to_timestamp(#{now})", "to_timestamp(#{now})"].join(', ') + ')')
	end

	def exec
		sql = @@template_prefix + @q.join(', ') + @@template_postfix

		ActiveRecord::Base.connection.execute(sql)
		websocket_message = {
			timestamp: @last_mod,
			exchange: @exchange_name,
			data: Dailydatum.where(exchange_id: @exchange_id,
														 modulus_timestamp: Time.at(@last_mod).to_datetime)
											.select('open, high, low, close')
		}

		ActionCable.server.broadcast 'ticker_channel', message: websocket_message
	end
end