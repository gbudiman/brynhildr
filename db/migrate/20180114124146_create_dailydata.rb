class CreateDailydata < ActiveRecord::Migration[5.1]
  def change
    create_table :dailydata, id: false do |t|
    	t.bigserial 														 :id, primary_key: true
    	t.timestamp 														 :modulus_timestamp, null: false
    	t.belongs_to 														 :exchange, index: true, type: :bigint, null: false, foreign_key: true
    	t.string 																 :base_currency, null: false
    	t.string 																 :quote_currency, null: false
    	t.float																	 :open
    	t.float																	 :high
    	t.float																	 :low
    	t.float 																 :close, null: false
    	t.float 																 :volume, null: false
      t.timestamps
    end

    add_index :dailydata, [:exchange_id, :base_currency, :quote_currency, :modulus_timestamp], 
    					unique: true,
    					name: 'modulus_timestamp_unique_index'
  end
end
