Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root 												 to: 'dashboard#index'
  get '/preload_candlestick',  to: 'dashboard#get_historical_candlestick'
end
