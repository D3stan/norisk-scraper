# Event

## Role Selector
- event_organiser
- intermediary
- proxy
- other

### Specific Roles
- intermediary and proxy have 2 more inputs to be filled: COMPANY_NAME and AFM_NUMBER

## Type of Event Selector
- 1 Four evenings' walk
- 2 Company outing
- 56 Company party
- 3 Fair (exhibitor)
- 4 Fair (organiser)
- 5 Flower parade
- 6 Street fair
- 7 Neighbourhood party
- 8 Wedding
- 9 Carnival (party/procession)
- 10 Colour run
- 11 Concert
- 12 Conference
- 13 Dance party
- 14 Dance performance
- 15 Dinner show
- 16 Fundraising fair
- 17 Party
- 18 Festival
- 19 Cycling tour
- 20 Fundraising event
- 21 Gala
- 22 Lawnmower race
- 64 Hospitality Vaart
- 23 Huttenbouw’ (hut building event)
- 24 Wedding party
- 25 Ice rink
- 26 Incentive travel
- 27 Anniversary
- 28 Christmas market
- 29 Christmas market with ice rink
- 30 King's Day’ celebration
- 31 Lecture
- 32 Lustrum celebration
- 33 Market
- 34 Fashion show
- 35 Mud run / obstacle race
- 36 Open days
- 37 Horse riding event
- 38 Staff party
- 39 Private party
- 40 Product launch
- 41 Rally
- 42 Business event
- 43 Travel
- 44 School activity (party/trip/educational trip)
- 45 Schützenfest’
- 46 Seminar
- 47 Sinterklaas’ celebration
- 48 Sports event
- 49 Student party
- 50 Exhibition
- 51 Motor vehicle tour
- 52 Tractor pulling competition
- 53 Show
- 54 Hiking tour
- 55 Business trip
- 0 Other

# What to cover

## Cancellation cost

### Concellation due to non-appearance
if selected, another page will be added when the form is navigated to the next page.
The extra page will ask for the guest info:
* Guest name: `input[type="text"][name="cancellation_non_appearance[0][name]"]`
* Date of Birth (DD-MM-YYYY): `input[type="text"][name="cancellation_non_appearance[0][birthdate]"]`
* Artist (checkbox): `input[type="checkbox"][name="cancellation_non_appearance[0][artist]"]`
* Add Person: `button[type="button"]`
additional person has [1] instead of [0] in the selector and so on


when navigating to the next page of the form, it should appear a "your propostal" page, which can be identified by a "Quote via email" button (<a class="inline-block py-2 px-4 border border-primary-600 shadow-sm text-white text-center font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 w-full mb-2 md:w-auto md:mb-0" href="https://verzekeren.norisk.eu/en/embed/product/event-int/email?key=d82bca94-f505-4869-ad39-a9cfb704a31a">Quote via email</a>).
Here the script must parse the "Your Proposal" page and store the following information:
* **Sum excl.:** € xx,xx
* **Policy costs:** € xx,xx
* **Insurance tax:** € xx,xx
* **To pay:** € xx,xx
The information stored will then be presented to the user of this system as "first insight" of the cost of the insurance.


# Your Details

## Business type

Must be selected with a conditional check box:
* if business: `input[type="radio"][name="is_business"][value="1"]`
* if individual: `input[type="radio"][name="is_business"][value="0"]`
Based on the selection, the form will show additional fields to be filled.
For both of them, the following fields are required:
- Address: `input[type="text"][name="address"]`
- House number: `input[type="text"][name="house_number"]`
- Zipcode: `input[type="text"][name="zipcode"]`
- City: `input[type="text"][name="city"]`
- Country: currently in the code works with `ui-select#region input[role="combobox"]` in the `selectDropdown` function, but it is applied only to the first page.

### Business

- Company name: `input[type="text"][name="company_name"]`
- Commercial number: `input[type="text"][name="company_commercial_number"]`
- DUNS number (optional): `input[type="text"][name="company_duns_number"]`
- Legal form: `select[name="company_legal_form"]`
    * `association`
    * `church`
    * `cooperative_and_mutual_insurance_company`
    * `foundation`
    * `general_partnership`
    * `limited_partnership`
    * `partnership`
    * `private_limited_company`
    * `public_legal_entity`
    * `public_limited_company`
    * `sole_proprietorship`

### Individual

- Birth date (DD-MM-YYYY): `input[type="text"][name="birthdate"]`