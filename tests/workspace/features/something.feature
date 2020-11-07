@amazing
Feature: showing off behave

  @dangerous
  Scenario: run a simple test
     Given we have behave installed
      When we implement a test
      Then behave will test it for us!

  @dangerous
  Scenario: Stronger opponent
    Given the ninja has a third level black-belt
    When attacked by Chuck Norris
    Then the ninja should run for his life
      And fall off a cliff

  @critical
  Scenario Outline: Blenders
    Given I put <thing> in a blender,
      When I switch the blender on
      Then it should transform into <other thing>

  Examples: Amphibians
    | thing          | other thing |
    | Red Tree Frog  | red mush    |
    | Blue Tree Frog | blue mush   |

