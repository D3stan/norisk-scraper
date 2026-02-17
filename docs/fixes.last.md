# Scraper
We need to adapt the scraper to the new website:
- login at https://verzekeren.norisk.eu/agents
    * username
    * password
- select "create proposal" dropdown and press "Event insurance International" (or directly navigate to https://verzekeren.norisk.eu/en/agents/product/event-int?tp=30028)
- Some fields are already pre-filled, so they must NOT be modified:
    * About the event page (Adviser data section):
        - initials
        - preposition
        - lastName
        - phone
        - email
        - role
- However, the same page has event details and location that MUST be filled:
    * About the event page (The event section):
        - title (Reference)
        - type (Type of event)
        - start (First day)
        - days (Number of days)
        - visitors (Number of visitors)
        - description (Description)
    * About the event page (The location section):
        - venue_description (Venue)
        - address (Address)
        - house_number (Number)
        - zipcode (Zipcode)
        - city (City)
        - region (Country)
        - environment (Environment)
- Other fields must be filled on a different page because they were prefilled in the previous version:
    * Your Details page:
        - Initials
        - Preposition
        - Last name
        - Phone
        - Email
