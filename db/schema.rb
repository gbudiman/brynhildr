# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20171218090806) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "exchanges", force: :cascade do |t|
    t.string "exchange_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exchange_name"], name: "index_exchanges_on_exchange_name", unique: true
  end

  create_table "expairs", force: :cascade do |t|
    t.string "pair_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["pair_name"], name: "index_expairs_on_pair_name", unique: true
  end

  create_table "ohlcs", force: :cascade do |t|
    t.datetime "x_timestamp"
    t.bigint "exchange_id", null: false
    t.bigint "expair_id", null: false
    t.float "x_open"
    t.float "x_high"
    t.float "x_low"
    t.float "x_close"
    t.float "x_vwap"
    t.float "x_volume"
    t.integer "x_count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exchange_id", "expair_id", "x_timestamp"], name: "index_ohlcs_on_exchange_id_and_expair_id_and_x_timestamp", unique: true
    t.index ["exchange_id"], name: "index_ohlcs_on_exchange_id"
    t.index ["expair_id"], name: "index_ohlcs_on_expair_id"
  end

  add_foreign_key "ohlcs", "exchanges"
  add_foreign_key "ohlcs", "expairs"
end
