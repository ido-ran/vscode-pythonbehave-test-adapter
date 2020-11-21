from behave import *
import time

TIME_SCALE = 3

def sleep(seconds):
    time.sleep(TIME_SCALE * seconds)

@given('we have behave installed')
def step_impl(context):
    pass

@when('we implement a test')
def step_impl(context):
    assert True is not False

@then('behave will test it for us!')
def step_impl(context):
    assert True

@given('the ninja has a third level black-belt')
def step_impl(context):
    pass

@when('attacked by Chuck Norris')
def step_impl(context):
    sleep(0.3)
    assert True is not False

@then('the ninja should run for his life')
def step_impl(context):
    sleep(0.4)
    assert context.failed is False

@then('fall off a cliff')
def step_impl(context):
    sleep(0.2)
    assert False, 'The ninja has die :('

@given('I put Red Tree Frog in a blender,')
def step_impl(context):
    sleep(0.3)
    pass

@given('I put Blue Tree Frog in a blender,')
def step_impl(context):
    sleep(0.3)
    pass

@when('I switch the blender on')
def step_impl(context):
    sleep(0.5)
    assert True is not False

@then('it should transform into red mush')
def step_impl(context):
    assert True

@then('it should transform into blue mush')
def step_impl(context):
    assert False
