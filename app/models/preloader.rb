class Preloader < ApplicationRecord
	@public_api_endpoint = 'https://api.binance.com'
	@preload_limit = 100

	def self.preload pair:, resolution:
		endpoint = @public_api_endpoint + "/api/v1/klines?symbol=#{pair}&interval=#{resolution}&limit=#{@preload_limit}"

		return open(endpoint).read
	end

	def self.get_exchange_info
		endpoint = @public_api_endpoint + "/api/v1/exchangeInfo"

		return open(endpoint).read
	end
end