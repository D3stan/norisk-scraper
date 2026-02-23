<?php
/**
 * Template Name: Preventivo Evento
 * Description: Form for requesting event insurance quotes
 */

// Load all configurable options (with defaults)
$norisk = norisk_get_options();

get_header();
?>

<div class="norisk-form-container">
    <h1 id="formTitle"><?php echo esc_html( $norisk['page_title'] ); ?></h1>
    <p id="formSubtitle"><?php echo esc_html( $norisk['page_subtitle'] ); ?></p>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="norisk-loading-overlay">
        <div class="norisk-loading-bar-container">
            <div id="loadingBar" class="norisk-loading-bar"></div>
        </div>
        <p class="norisk-loading-text"><?php echo esc_html( $norisk['loading_text'] ); ?></p>
        <p class="norisk-loading-subtext"><?php echo esc_html( $norisk['loading_subtext'] ); ?></p>
    </div>

    <!-- Quote Form -->
    <form id="quoteForm" method="post">

        <!-- Personal Information -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_personal_title'] ); ?></h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="initials">Titolo *</label>
                    <select id="initials" name="initials" required>
                        <option value="">Seleziona...</option>
                        <option value="Sig.">Sig.</option>
                        <option value="Sign.ra">Sign.ra</option>
                    </select>
                </div>
                <div class="norisk-form-group">
                    <label for="lastName">Cognome Nome *</label>
                    <input type="text" id="lastName" name="lastName" required placeholder="Es. Rossi Mario">
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="phone">Telefono *</label>
                    <input type="tel" id="phone" name="phone" required>
                </div>
                <div class="norisk-form-group">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" required>
                </div>
            </div>

            <!-- Dati Aziendali -->
            <h4 class="norisk-subsection-title"><?php echo esc_html( $norisk['section_company_title'] ); ?></h4>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="company_name">Ragione Sociale *</label>
                    <input type="text" id="company_name" name="company_name" required placeholder="Es. Mario Rossi S.r.l.">
                </div>
                <div class="norisk-form-group">
                    <label for="company_commercial_number">Partita IVA *</label>
                    <input type="text" id="company_commercial_number" name="company_commercial_number" required placeholder="Es. IT12345678901">
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="company_legal_form">Forma Giuridica *</label>
                    <select id="company_legal_form" name="company_legal_form" required>
                        <option value="">Seleziona...</option>
                        <option value="association">Associazione</option>
                        <option value="church">Ente Religioso</option>
                        <option value="cooperative_and_mutual_insurance_company">Cooperativa / Societa di Mutuo Soccorso</option>
                        <option value="foundation">Fondazione</option>
                        <option value="general_partnership">Societa in Nome Collettivo (S.n.c.)</option>
                        <option value="limited_partnership">Societa in Accomandita Semplice (S.a.s.)</option>
                        <option value="partnership">Societa di Persone</option>
                        <option value="private_limited_company">Societa a Responsabilita Limitata (S.r.l.)</option>
                        <option value="public_legal_entity">Ente Pubblico</option>
                        <option value="public_limited_company">Societa per Azioni (S.p.A.)</option>
                        <option value="sole_proprietorship">Ditta Individuale</option>
                    </select>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="company_address">Indirizzo *</label>
                    <input type="text" id="company_address" name="company_address" required>
                </div>
                <div class="norisk-form-group">
                    <label for="company_house_number">Numero Civico *</label>
                    <input type="text" id="company_house_number" name="company_house_number" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="company_zipcode">CAP *</label>
                    <input type="text" id="company_zipcode" name="company_zipcode" required>
                </div>
                <div class="norisk-form-group">
                    <label for="company_city">Citta *</label>
                    <input type="text" id="company_city" name="company_city" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="company_country">Paese *</label>
                    <select id="company_country" name="company_country" required>
                        <option value="it" selected>Italia</option>
                        <option value="nl">Paesi Bassi</option>
                        <option value="de">Germania</option>
                        <option value="fr">Francia</option>
                        <option value="es">Spagna</option>
                        <option value="gb">Regno Unito</option>
                        <option value="us">Stati Uniti</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Event Information -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_event_title'] ); ?></h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="eventName">Nome Evento *</label>
                    <input type="text" id="eventName" name="eventName" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="eventType">Tipo di Evento *</label>
                    <select id="eventType" name="eventType" required>
                        <option value="">Seleziona...</option>
                        <option value="18">Festival / Concerto</option>
                        <option value="1">Fiera / Esposizione</option>
                        <option value="2">Conferenza / Congresso</option>
                        <option value="3">Sportivo</option>
                        <option value="4">Culturale</option>
                        <option value="5">Aziendale</option>
                        <option value="6">Privato / Festa</option>
                        <option value="7">Matrimonio</option>
                        <option value="8">Altro</option>
                    </select>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="startDate">Data Inizio *</label>
                    <input type="date" id="startDate" name="startDate" required>
                    <span id="startDateError" class="norisk-field-error" style="display:none; color:#e74c3c; font-size:0.85em; margin-top:4px;"></span>
                </div>
                <div class="norisk-form-group">
                    <label for="days">Durata (giorni) *</label>
                    <input type="number" id="days" name="days" min="1" max="30" value="1" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="visitors">Numero Partecipanti *</label>
                    <input type="number" id="visitors" name="visitors" min="1" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="description">Descrizione Evento *</label>
                    <textarea id="description" name="description" maxlength="500" rows="4" required></textarea>
                </div>
            </div>
        </div>

        <!-- Location -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_location_title'] ); ?></h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="venueDescription">Descrizione Location</label>
                    <input type="text" id="venueDescription" name="venueDescription" placeholder="Es. Parco pubblico, Centro congressi, etc.">
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="address">Indirizzo *</label>
                    <input type="text" id="address" name="address" required>
                </div>
                <div class="norisk-form-group">
                    <label for="houseNumber">Numero Civico *</label>
                    <input type="text" id="houseNumber" name="houseNumber" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="zipcode">CAP *</label>
                    <input type="text" id="zipcode" name="zipcode" required>
                </div>
                <div class="norisk-form-group">
                    <label for="city">Citta *</label>
                    <input type="text" id="city" name="city" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="country">Paese *</label>
                    <select id="country" name="country" required>
                        <option value="it" selected>Italia</option>
                        <option value="nl">Paesi Bassi</option>
                        <option value="de">Germania</option>
                        <option value="fr">Francia</option>
                        <option value="es">Spagna</option>
                        <option value="gb">Regno Unito</option>
                        <option value="us">Stati Uniti</option>
                    </select>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label>Ambiente *</label>
                    <div class="norisk-radio-group">
                        <label>
                            <input type="radio" name="environment" value="outdoor" checked>
                            All'aperto
                        </label>
                        <label>
                            <input type="radio" name="environment" value="indoor">
                            Al chiuso
                        </label>
                        <label>
                            <input type="radio" name="environment" value="both">
                            Entrambi
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Coverage Options -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_coverage_title'] ); ?></h3>
            <p class="norisk-coverage-note"><?php echo esc_html( $norisk['coverage_note'] ); ?></p>

            <?php if ( $norisk['show_coverage_cancellation'] ): ?>
            <!-- Cancellation Costs -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_cancellation" name="coverage_cancellation" value="1">
                    <span class="norisk-coverage-title">Costi di Annullamento</span>
                </label>
                <div class="norisk-coverage-options" id="options_cancellation">
                    <div class="norisk-form-group">
                        <label for="cancellation_total_cost">Qual e il costo totale per organizzare questo evento?</label>
                        <input type="number" id="cancellation_total_cost" name="cancellation_total_cost" min="0" placeholder="€">
                    </div>
                    <div class="norisk-checkbox-group">
                        <?php if ( $norisk['show_cancellation_non_appearance'] ): ?>
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="non_appearance">
                            Annullamento per mancata partecipazione (artista/ospite)
                        </label>
                        <div class="norisk-sub-options" id="non_appearance_guests_container" style="display: none; margin-left: 30px;">
                            <div id="guests_list">
                                <div class="norisk-guest-entry">
                                    <input type="text" name="guest_name[]" placeholder="Nome ospite" class="norisk-guest-name">
                                    <input type="date" name="guest_birthdate[]" class="norisk-guest-date">
                                    <label><input type="checkbox" name="guest_artist[]" value="1"> Artista</label>
                                </div>
                            </div>
                            <button type="button" onclick="addGuest()" class="norisk-add-btn">+ Aggiungi ospite</button>
                        </div>
                        <?php endif; ?>
                        <?php if ( $norisk['show_cancellation_weather'] ): ?>
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="extreme_weather">
                            Annullamento per condizioni meteorologiche estreme
                        </label>
                        <?php endif; ?>
                        <?php if ( $norisk['show_cancellation_profit'] ): ?>
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="profit_max_50" id="cb_profit_max_50">
                            Perdita Profitto (fino a massimo 50% dei costi di annullamento)
                        </label>
                        <div class="norisk-sub-options" id="profit_max_50_container" style="display: none; margin-left: 30px; margin-top: 8px;">
                            <div class="norisk-form-group">
                                <label for="profit_estimate">Stima guadagno</label>
                                <input type="text" id="profit_estimate" name="profit_estimate" placeholder="€" class="norisk-number-formatted">
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_liability'] ): ?>
            <!-- Liability -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_liability" name="coverage_liability" value="1">
                    <span class="norisk-coverage-title">Responsabilita Civile</span>
                </label>
                <div class="norisk-coverage-options" id="options_liability">
                    <div class="norisk-form-group">
                        <label>Per quale importo vuoi assicurare la tua responsabilita?</label>
                        <div class="norisk-radio-group">
                            <label>
                                <input type="radio" name="liability_amount" value="<?php echo (int) $norisk['liability_amount_1']; ?>">
                                € <?php echo number_format( (int) $norisk['liability_amount_1'], 0, ',', '.' ); ?>
                            </label>
                            <label>
                                <input type="radio" name="liability_amount" value="<?php echo (int) $norisk['liability_amount_2']; ?>">
                                € <?php echo number_format( (int) $norisk['liability_amount_2'], 0, ',', '.' ); ?>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_equipment'] ): ?>
            <!-- Equipment -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_equipment" name="coverage_equipment" value="1">
                    <span class="norisk-coverage-title">Attrezzature</span>
                </label>
                <div class="norisk-coverage-options" id="options_equipment">
                    <div class="norisk-form-group">
                        <label for="equipment_value">Valore del materiale da assicurare</label>
                        <input type="number" id="equipment_value" name="equipment_value" min="0" placeholder="€">
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_money'] ): ?>
            <!-- Money -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_money" name="coverage_money" value="1">
                    <span class="norisk-coverage-title">Denaro</span>
                </label>
                <div class="norisk-coverage-options" id="options_money">
                    <div class="norisk-form-group">
                        <label for="money_amount">Quanto denaro vuoi assicurare ogni giorno?</label>
                        <input type="number" id="money_amount" name="money_amount" min="0" placeholder="€">
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_accidents'] ): ?>
            <!-- Accidents -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_accidents" name="coverage_accidents" value="1">
                    <span class="norisk-coverage-title">Infortuni</span>
                </label>
                <div class="norisk-coverage-options" id="options_accidents">
                    <div class="norisk-form-group">
                        <label for="accidents_employees">Numero di dipendenti (in giorni-uomo)</label>
                        <select id="accidents_employees" name="accidents_employees">
                            <option value="none">Nessuno</option>
                            <option value="1-50">1 - 50</option>
                            <option value="51-100">51 - 100</option>
                            <option value="101-250">101 - 250</option>
                            <option value="251-500">251 - 500</option>
                            <option value="501-1000">501 - 1000</option>
                            <option value="1001-1500">1001 - 1500</option>
                            <option value="1501-2000">1501 - 2000</option>
                            <option value="2001-2500">2001 - 2500</option>
                            <option value="2501-3000">2501 - 3000</option>
                            <option value="3001-3500">3001 - 3500</option>
                            <option value="3501-4000">3501 - 4000</option>
                            <option value="4001-5000">4001 - 5000</option>
                        </select>
                    </div>
                    <div class="norisk-form-group">
                        <label for="accidents_participants">Numero di partecipanti (in giorni-uomo)</label>
                        <select id="accidents_participants" name="accidents_participants">
                            <option value="none">Nessuno</option>
                            <option value="1-50">1 - 50</option>
                            <option value="51-100">51 - 100</option>
                            <option value="101-250">101 - 250</option>
                            <option value="251-500">251 - 500</option>
                            <option value="501-1000">501 - 1000</option>
                            <option value="1001-1500">1001 - 1500</option>
                            <option value="1501-2000">1501 - 2000</option>
                            <option value="2001-2500">2001 - 2500</option>
                            <option value="2501-3000">2501 - 3000</option>
                            <option value="3001-3500">3001 - 3500</option>
                            <option value="3501-4000">3501 - 4000</option>
                            <option value="4001-5000">4001 - 5000</option>
                            <option value="5001-6000">5001 - 6000</option>
                            <option value="6001-7000">6001 - 7000</option>
                            <option value="7001-8000">7001 - 8000</option>
                            <option value="8001-9000">8001 - 9000</option>
                            <option value="9001-10000">9001 - 10000</option>
                        </select>
                    </div>
                    <div class="norisk-checkbox-group">
                        <label>
                            <input type="checkbox" name="accidents_sport" value="1">
                            Sport incluso
                        </label>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <!-- Privacy -->
        <div class="norisk-privacy-row">
            <input type="checkbox" id="privacyAccept" name="privacyAccept" required>
            <label for="privacyAccept"><?php echo esc_html( $norisk['privacy_label'] ); ?> <a href="<?php echo esc_url( $norisk['privacy_url'] ); ?>" target="_blank">informativa sulla privacy</a> <span style="color: var(--brand-primary);">*</span></label>
        </div>

        <!-- Submit -->
        <button type="submit" class="norisk-submit-btn"><?php echo esc_html( $norisk['submit_btn_text'] ); ?></button>
    </form>

    <!-- Results Section -->
    <div id="resultsSection" class="norisk-results">
        <h2 id="resultsTitle"></h2>
        <div id="resultsContent"></div>
    </div>
</div>

<?php
get_footer();
