# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

Exchange.create([{exchange_name: 'Kraken'}])
Expair.create([{pair_name: 'BTC|USD'}, 
							 {pair_name: 'XMR|USD'},
							 {pair_name: 'XRP|USD'},
							 {pair_name: 'LTC|USD'},
							 {pair_name: 'ETC|USD'},
							 {pair_name: 'DASH|USD'},
							 {pair_name: 'ZEC|USD'},
							 {pair_name: 'IOTA|USD'},
							 {pair_name: 'BCH|USD'}])