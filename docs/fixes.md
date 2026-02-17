- "Ruolo" should be removed completely

- "Ambiente" must be placed in "Location" section and not where it is now and should have 3 selections:
    * all'aperto
    * al chiuso
    * entrambi

- "Coperture Richieste" should have the dynamic options that are shown when selecting the type of insurance required:
    * Cancellation costs is missing completely and it has:
        - "What does it cost to organise this event in total?" (text number input)
        - Cancellation due to non-appearance (multiple choice checkbox) -> this is the only one that when selected asks for the people information, which are in the format `non_appearance_guests: [
            { name: "Rock Star 1", birthdate: "01-01-1990", artist: true },
            { name: "Guest Speaker", birthdate: "05-05-1980", artist: false }
        ],`
        - Cancellation due extreme weather (multiple choice checkbox)
        - Profit maximum 50% of the costs according to budget (multiple choice checkbox)
    * Liability which has:
        - "For what amount do you want to insure your liability?" (single choice checkbox, with values 2.500.000 or 5.000.000)
    * Equipment which has:
        - "Value of material to be insured" (text number input)
    * Money which has:
        - "How much money do you want to insure each day?" (text number input)
    * Accidents which has:
        - "Number of employees (in man days)" (dropdown selection with values: None, 1 - 50, 51 - 100, 101 - 250, 251 - 500, 501 - 1000, 1001 - 1500, 1501 - 2000, 2001 - 2500, 2501 - 3000, 3001 - 3500, 3501 - 4000, 4501 - 5000)
        - "Number of participants (in man days)" (dropdown selection with values: None, 1 - 50, 51 - 100, 101 - 250, 251 - 500, 501 - 1000, 1001 - 1500, 1501 - 2000, 2001 - 2500, 2501 - 3000, 3001 - 3500, 3501 - 4000, 4501 - 5000, 5001 - 6000, 6001 - 7000, 7001 - 8000, 8001 - 9000, 9001 - 10000)
        - Sport included (checkbox)