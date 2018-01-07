class DashboardController < ApplicationController
	def get_historical_candlestick
		pair = request['symbol']
		resolution = request['interval']

		render json: Preloader.preload(pair: pair, resolution: resolution)
	end

	def get_exchange_info
		render json: Preloader.get_exchange_info
	end
end
