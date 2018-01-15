namespace :task_master do
	task run: [ :environment ] do
		TaskMaster.run
	end
end
