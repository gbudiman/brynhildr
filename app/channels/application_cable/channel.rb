module ApplicationCable
  class Channel < ActionCable::Channel::Base
  end

  class TickerChannel < ApplicationCable::Channel
  	def subscribed
  	end
  end
end
