class CreateExchanges < ActiveRecord::Migration[5.1]
  def change
    create_table :exchanges, id: false do |t|
    	t.bigserial												       :id, primary_key: true
    	t.string 																 :exchange_name, null: false
      t.timestamps
    end
  end
end
