class TickerChannel < ApplicationCable::Channel
  def subscribed
    stream_from 'ticker_channel'
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end
end
