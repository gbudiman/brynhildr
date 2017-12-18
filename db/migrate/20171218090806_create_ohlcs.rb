class CreateOhlcs < ActiveRecord::Migration[5.1]
	def change
		create_table :exchanges, id: false do |t|
			t.bigserial 						 :id, primary_key: true
			t.string 								 :exchange_name, null: false
			t.timestamps
		end

		create_table :expairs, id: false do |t|
			t.bigserial 						 :id, primary_key: true
			t.string 								 :pair_name, null: false
			t.timestamps
		end

    create_table :ohlcs, id: false do |t|
    	t.bigserial 			       :id, primary_key: true
    	t.timestamp 						 :x_timestamp
    	t.belongs_to 						 :exchange, index: true, type: :bigint, null: false, foreign_key: true
    	t.belongs_to 						 :expair, index: true, type: :bigint, null: false, foreign_key: true
    	t.float 								 :x_open
    	t.float 								 :x_high
    	t.float 								 :x_low
    	t.float 								 :x_close
    	t.float 								 :x_vwap
    	t.float 								 :x_volume
    	t.integer 							 :x_count
      t.timestamps
    end

    add_index :exchanges, [:exchange_name], unique: true
    add_index :expairs, [:pair_name], unique: true
    add_index :ohlcs, [:exchange_id, :expair_id, :x_timestamp], unique: true
  end
end
