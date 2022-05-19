.PHONY:prepare
prepare:
	npm run prepare

.PHONY:act
act: prepare
	act pull_request -j test
