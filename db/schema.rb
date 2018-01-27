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

ActiveRecord::Schema.define(version: 20180127132718) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "dailydata", force: :cascade do |t|
    t.datetime "modulus_timestamp", null: false
    t.bigint "exchange_id", null: false
    t.string "base_currency", null: false
    t.string "quote_currency", null: false
    t.float "open"
    t.float "high"
    t.float "low"
    t.float "close", null: false
    t.float "volume", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exchange_id", "base_currency", "quote_currency", "modulus_timestamp"], name: "modulus_timestamp_unique_index", unique: true
    t.index ["exchange_id"], name: "index_dailydata_on_exchange_id"
  end

  create_table "exchanges", force: :cascade do |t|
    t.string "exchange_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exchange_name"], name: "index_exchanges_on_exchange_name", unique: true
  end

  add_foreign_key "dailydata", "exchanges"
end
