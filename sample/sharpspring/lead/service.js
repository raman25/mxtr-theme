(function (window) {
    var api, request, response;

    request = function (method, req) {
        req = req || {};
        req.method = method;
        var data = {method: method};
        data.params = req.params || {};
        var response = function () { api.response(req, arguments); };
        var promise = null;

        for (var param in data.params) {
            if (data.params[param] === null) {
                delete data.params[param];
            }
        }

        if (req.cache) {
            var cacheValue = req.cache > 0 ? _.store(req.cacheKey) : '';

            if (req.cache > 0 && cacheValue && cacheValue.length) {
                req.cacheKey = req.method + JSON.stringify(data.params);
                req.fromCache = true;
                promise = new $.Deferred();
                promise.always(response).resolve(cacheValue, 'success');
            }
        }

        if (!promise) {
            var xhrOptions = {
                type: 'POST',
                url: '/api/' + req.method,
                data: data.params,
                dataType: 'text',
                processData: true,
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
            };

            if (req.files) {
                var formData = new FormData();

                var dKey;
                for (dKey in req.files) {
                    if (req.files.hasOwnProperty(dKey)) {
                        formData.append(dKey, req.files[dKey]);
                    }
                }
                for (dKey in req.params) {
                    if (req.params.hasOwnProperty(dKey)) {
                        formData.append(dKey, req.params[dKey]);
                    }
                }

                xhrOptions.data = formData;
                xhrOptions.processData = false;
                xhrOptions.contentType = false;

                if (req.progress || req.uploadProgress) {
                    xhrOptions.xhr = function () {
                        var xhr = new window.XMLHttpRequest();

                        if (xhr.upload && xhr.upload.addEventListener && req.uploadProgress) {
                            xhr.upload.addEventListener('progress', req.uploadProgress, false);
                        }

                        if (xhr.addEventListener && req.progress) {
                            xhr.addEventListener('progress', req.progress, false);
                        }

                        return xhr;
                    };
                }
            }

            promise = $.ajax(xhrOptions).always(response);
        }

        if (req.loading) { _.pub('api.loading', req); }

        return promise;
    };

    response = function (req, args) {
        if (req.getResponseHeader && req.getResponseHeader('X-Login')) {
            location.replace('/'); // Take them to the login screen
        }

        if (args[1] == 'success' && args[0] !== undefined) {
            args[0] = args[0].trim();
            var json = args[0].match(/\{/);
            if ((!json || json.index > 0) && console && app.ENV === 'development') {
                endOfIndex = json ? json.index : args[0].length;
                console.error({ method: req.method, error: args[0].substr(0, endOfIndex) });
            }

            if (json && (json.index || json.index === 0)) {
                // Don't recache
                if (req.cache > 0 && !req.fromCache) {
                    try {
                        _.store(req.cacheKey, args[0], {expires: req.cache});
                    } catch (err) {
                        console.warn('Could not store', req.cacheKey, err);
                    }
                }

                try {
                    args[0] = JSON.parse(args[0].substr(json.index));
                } catch (err) {
                    if (console && app.ENV === 'development') {
                        console.warn('Could not parse return');
                    }
                }
            }

            if (typeof req.success === 'function') {
                req.success.apply(this, args);
            } else if (console) {
                console.warn('No Success Callback', req);
            }

            _.pub(['api', req.method, 'success'].join('.'), args[0]);
        } else if (req.error) {
            if (args[0] && args[0].responseText) {
                args[0].responseText = args[0].responseText.trim();
                json = args[0].responseText.match(/\{/);

                if (json && (json.index || json.index === 0)) {
                    try {
                        args[0].response = JSON.parse(args[0].responseText.substr(json.index));
                    } catch (err) {
                        if (console && app.ENV === 'development') {
                            console.warn('Could not parse return');
                        }
                    }
                }
            }
            req.error.apply(this, args);
        } else {
            console.warn({ method: req.method, error: arguments });
        }

        if (req.loading) { _.pub('api.loaded', req); }
    };

    var DEFAULT_ORIGIN_VERSION = 'v1';

    window.origin = function (path, options, data) {
        options = options || {};

        // Cleanup the path and add prefixes as needed
        var apiVersion = options.version || DEFAULT_ORIGIN_VERSION;
        delete options.version;
        if (path[0] !== '/') {
            path = '/' + path;
        }
        path = '/' + apiVersion + path;

        // Encode data if provided
        if (typeof data !== 'undefined') {
            try {
                options.data = JSON.stringify(data);
            } catch (ex) {
                return $.Deferred().reject({type: 'json', message: 'Unable to encode JSON data', ex: ex});
            }
        }

        // If the loading icon was requested, publish the event and set a variable to clean up afterwards
        var loading = !!options.loading;
        delete options.loading;
        if (loading) {
            _.pub('api.loading', null);
        }

        // TODO: file uploads?

        // Send the request
        var promise = $.ajax('/origin' + path, options);
        if (loading) {
            return promise.always(function () { _.pub('api.loaded', null); });
        }
        return promise;
    };

    api = {
        request: request,
        response: response,

        /* WHoa!? Search */
        getSearch: function (searchType, searchString, options, success, error) {
            options = JSON.stringify(options);
            return request('getSearch', {
                params: {searchType: searchType, searchString: searchString, options: options},
                success: success,
                error: error,
                loading: 1,
                cache: 5 * 60 * 1000 // 5 minutes
            });
        },

        getGlobalSearch: function (searchString, options, success, error) {
            options = JSON.stringify(options);
            return request('getGlobalSearch', {
                params: {searchString: searchString, options: options},
                success: success,
                error: error,
                loading: 1,
                cache: 5 * 60 * 1000 // 5 minutes
            });
        },

        /* Search for objects that are combinations of already indexed searches (i.e. emailjob is list/email or lead/email) */
        getCombinationSearch: function (searchType, searchString, options, success, error) {
            options = JSON.stringify(options);
            return request('getCombinationSearch', {
                params: { searchType: searchType, searchString: searchString, options: options },
                success: success,
                error: error,
                loading: 1,
                cache: 5 * 60 * 1000 // 5 minutes
            });
        },

        getSavedSearches: function (options, success, error) {
            options = JSON.stringify(options);
            return request('getSavedSearches', {
                params: { options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteSavedSearch: function (searchID, options, success, error) {
            options = JSON.stringify(options);
            return request('deleteSavedSearch', {
                params: { searchID: searchID, options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        getRecentSearches: function (options, success, error) {
            options = JSON.stringify(options);
            return request('getRecentSearches', {
                params: { options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        addRecentSearch: function (uiEncoding, options, success, error) {
            options = JSON.stringify(options);
            return request('addRecentSearch', {
                params: { uiEncoding: uiEncoding, options: options },
                success: success,
                error: error,
                loading: 0
            });
        },

        getDefaultSearch: function (options, success, error) {
            options = JSON.stringify(options);
            return request('getDefaultSearch', {
                params: { options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        setDefaultSearch: function (searchID, options, success, error) {
            options = JSON.stringify(options);
            return request('setDefaultSearch', {
                params: { searchID: searchID, options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        removeDefaultSearch: function (searchID, options, success, error) {
            options = JSON.stringify(options);
            return request('removeDefaultSearch', {
                params: { searchID: searchID, options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        removeSavedSearch: function (searchID, options, success, error) {
            options = JSON.stringify(options);
            return request('removeSavedSearch', {
                params: { searchID: searchID, options: options },
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Campaigns */
        getCampaigns: function (isActive, isOrganic, type, success, error) {
            return request('getCampaigns', {
                params: {isActive: isActive, isOrganic: isOrganic, type: type},
                success: success,
                error: error,
                loading: 1,
                cache: 5 * 60 * 1000
            });
        },

        getCampaignDataOverRange: function (campaignID, reportType, startDate, endDate, interval, success, error) {
            if (campaignID && campaignID.length) {
                campaignID = JSON.stringify(campaignID);
            }

            return request('getCampaignDataOverRange', {
                params: {campaignID: campaignID, reportType: reportType, startDate: startDate, endDate: endDate, interval: interval},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* DEPREACTED */
        getCampaignLeads: function (campaignID, startDate, endDate, interval, success, error) {
            if (campaignID.length) {
                campaignID = JSON.stringify(campaignID);
            }

            return request('getCampaignLeads', {
                params: {campaignID: campaignID, startDate: startDate, endDate: endDate, interval: interval},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* DEPREACTED */
        getCampaignOpps: function (campaignID, startDate, endDate, interval, success, error) {
            if (campaignID.length) {
                campaignID = JSON.stringify(campaignID);
            }

            return request('getCampaignOpps', {
                params: {campaignID: campaignID, startDate: startDate, endDate: endDate, interval: interval},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* DEPREACTED */
        getCampaignOppsWon: function (campaignID, startDate, endDate, interval, success, error) {
            if (campaignID.length) {
                campaignID = JSON.stringify(campaignID);
            }

            return request('getCampaignOppsWon', {
                params: {campaignID: campaignID, startDate: startDate, endDate: endDate, interval: interval},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* DEPREACTED */
        getCampaignOppsLost: function (campaignID, startDate, endDate, interval, success, error) {
            if (campaignID.length) {
                campaignID = JSON.stringify(campaignID);
            }

            return request('getCampaignOppsLost', {
                params: {campaignID: campaignID, startDate: startDate, endDate: endDate, interval: interval},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Make favorite/not favorite */

        getFavorites: function (favoriteType, options, success, error) {
            options = JSON.stringify(options);
            return request('getFavorites', {
                params: {favoriteType: favoriteType, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFavorite: function (favoriteType, favoriteID, favorite, success, error) {
            favorite = favorite ? 1 : 0;
            return request('setFavorite', {
                params: { favoriteID: favoriteID, favoriteType: favoriteType, isFavorite: favorite },
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Campaign Tags */

        getTagAutocomplete: function (needle, success, error) {
            return request('getTagAutocomplete', {
                params: {needle: needle},
                success: success,
                error: error,
                loading: 1
            });
        },

        setCampaignTag: function (campaignID, tagName, success, error) {
            return request('setCampaignTag', {
                params: {campaignID: campaignID, tagName: tagName},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteCampaignTag: function (campaignID, tagName, success, error) {
            return request('deleteCampaignTag', {
                params: {campaignID: campaignID, tagName: tagName},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Sales */
        getSalesWorkingOpps: function (startDate, endDate, options, success, error) {
            options = JSON.stringify(options);
            return request('getSalesWorkingOpps', {
                params: {startDate: startDate, endDate: endDate, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllSalesWon: function (startDate, endDate, interval, success, error) {
            return request('getAllSalesWon', {
                params: {startDate: startDate, endDate: endDate, interval: interval},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Sites Settings
        setSite: function (siteID, site, success, error) {
            var site = JSON.stringify(site);
            return request('setSite', {
                params: {siteID: siteID, site: site},
                success: success,
                error: error,
                loading: 1
            });
        },

        setSiteMapping: function (siteID, urlFragment, campaignID, success, error) {
            return request('setSiteMapping', {
                params: {siteID: siteID, urlMatch: urlFragment, campaignID: campaignID},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteSiteMapping: function (id, success, error) {
            return request('deleteSiteMapping', {
                params: {id: id},
                success: success,
                error: error,
                loading: 1
            });
        },

        setSitePage: function (siteID, url, annotation, color, success, error) {
            return request('setSitePage', {
                params: {siteID: siteID, url: url, annotation: annotation, color: color},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteSitePage: function (pageID, success, error) {
            return request('deleteSitePage', {
                params: {id: pageID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getVisitors: function (siteIDs, settings, success, error) {
            if (_.isArray(siteIDs)) { siteIDs = siteIDs.join(','); }
            settings = JSON.stringify(settings);
            return request('getVisitors', {
                params: {siteIDs: siteIDs, settings: settings},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAudiences: function (success, error) {
            return request('getAudiences', {
                params: {},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAudienceByID: function (id, options, success, error) {
            return request('getAudienceByID', {
                params: {id: id, options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        addAudienceToAsset: function (audienceID, assetType, assetID, success, error) {
            return request('addAudienceToAsset', {
                params: {
                    audienceID: audienceID,
                    assetType: assetType,
                    assetID: assetID
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        removeAudienceFromAsset: function (audienceID, assetType, assetID, agreement, success, error) {
            return request('removeAudienceFromAsset', {
                params: {
                    audienceID: audienceID,
                    assetType: assetType,
                    assetID: assetID,
                    agreement: agreement
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteSegment: function (segmentID, agreement, success, error) {
            return request('deleteSegment', {
                params: {
                    segmentID: segmentID,
                    agreement: agreement
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setAudience: function (title, desc, expression, audienceID, fields, assets, folderID, isActive, success, error) {
            return request('setAudience', {
                params: {
                    title: title,
                    desc: desc,
                    expression: expression,
                    audienceID: audienceID,
                    fields: JSON.stringify(fields || []),
                    assets: JSON.stringify(assets || []),
                    folderID: folderID,
                    isActive: isActive
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setAudienceSegment: function (title, audienceID, rules, segmentID, isActive, success, error) {
            return request('setAudienceSegment', {
                params: {
                    title: title,
                    audienceID: audienceID,
                    rules: JSON.stringify(rules || []),
                    segmentID: segmentID,
                    isActive: isActive
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        createCustomFields: function (fields, csvKeys, success, error) {
            return request('createCustomFields', {
                params: {
                    fields: JSON.stringify(fields),
                    csvKeys: JSON.stringify(csvKeys)
                },
                success: success,
                error: error
            });
        },

        getFields: function (options, success, error) {
            return request('getFields', {
                params: {
                    options: JSON.stringify(options || {})
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        getCustomFieldValues: function (fieldID, options, success, error) {
            return request('getCustomFieldValues', {
                params: { fieldID: fieldID, options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 0
            });
        },

        getFunnelAudiences: function (funnelID, success, error) {
            return request('getFunnelAudiences/' + funnelID, {
                success: success,
                error: error,
                loading: 1
            });
        },

        setFunnelAudience: function (funnelID, audienceID, deleteRecord, success, error) {
            return request('setFunnelAudience', {
                params: {
                    funnelID: funnelID,
                    audienceID: audienceID,
                    delete: deleteRecord
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setFunnelSegment: function (funnelID, segmentID, deleteRecord, success, error) {
            return request('setFunnelSegment', {
                params: {
                    funnelID: funnelID,
                    segmentID: segmentID,
                    delete: deleteRecord
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        getEmailAudiences: function (emailID, success, error) {
            return request('getEmailAudiences/' + emailID, {
                success: success,
                error: error,
                loading: 1
            });
        },

        deletePersona: function (personaID, agreement, success, error) {
            return request('deletePersona', {
                params: {
                    personaID: personaID,
                    agreement: agreement
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        deletePersonaFieldGroup: function (groupID, agreement, success, error) {
            return request('deletePersonaFieldGroup', {
                params: {
                    groupID: groupID,
                    agreement: agreement
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        createNewPersona: function (name, title, answer, question, success, error) {
            return request('createNewPersona', {
                params: {
                    name: name,
                    title: title,
                    answer: answer,
                    question: question
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        savePersonaProfile: function (personaID, data, success, error) {
            return request('savePersonaProfile', {
                params: {
                    personaID: personaID,
                    data: JSON.stringify(data)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        changePersonaQuestion: function (newValue, success, error) {
            return request('changePersonaQuestion', {
                params: {
                    value: newValue
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        savePersonaFieldValues: function (personaID, data, isTextArea, success, error) {
            return request('savePersonaFieldValues', {
                params: {
                    personaID: personaID,
                    isTextArea: isTextArea,
                    data: JSON.stringify(data)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        savePersonaDemographicValues: function (personaID, avatar, fields, success, error) {
            return request('savePersonaDemographicValues', {
                params: {
                    personaID: personaID,
                    avatar: avatar,
                    fields: JSON.stringify(fields)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setPersonaSelection: function (leadID, personaID, success, error) {
            return request('setPersonaSelection', {
                params: {
                    leadID: leadID,
                    personaID: personaID
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        savePersonaFieldGroup: function (group, fieldsToDelete, fieldsToUpdate, newFields, success, error) {
            return request('savePersonaFieldGroup', {
                params: {
                    group: JSON.stringify(group),
                    fieldsToDelete: JSON.stringify(fieldsToDelete),
                    fieldsToUpdate: JSON.stringify(fieldsToUpdate),
                    newFields: JSON.stringify(newFields)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        getPersonaCount: function (success, error) {
            return request('getPersonaCount', {
                params: {},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllPersonasForCompany: function (options, success, error) {
            return request('getAllPersonasForCompany', {
                params: {options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        assignBulkCampaign: function (campaignID, leadIDs, options, success, error) {
            return request('assignBulkCampaign', {
                params: { campaignID: campaignID, leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        assignBulkPersona: function (persona, leadIDs, options, success, error) {
            return request('assignBulkPersona', {
                params: { persona: persona, leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        getPersonaFieldsByLocation: function (options, success, error) {
            return request('getPersonaFieldsByLocation', {
                params: { options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        assignBulkList: function (listID, leadIDs, options, success, error) {
            return request('assignBulkList', {
                params: { listID: listID, leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        assignBulkAccount: function (accountID, leadIDs, options, success, error) {
            return request('assignBulkAccount', {
                params: { accountID: accountID, leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        createAndAssignBulkAccount: function (accountData, leadIDs, options, success, error) {
            return request('createAndAssignBulkAccount', {
                params: { accountData: JSON.stringify(accountData), leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        createAndAssignBulkList: function (listName, description, availableInContactManager, leadIDs, options, success, error) {
            return request('createAndAssignBulkList', {
                params: {
                    name: listName,
                    description: description,
                    availableInContactManager: availableInContactManager,
                    leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        createTempBulkList: function (leadIDs, options, success, error) {
            return request('createTempBulkList', {
                params: { leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        sendBulkEmailToList: function (emailID, listID, bulkEditID, options, success, error) {
            return request('sendBulkEmailToList', {
                params: { emailID: emailID, listID: listID, bulkEditID: bulkEditID, options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        editBulkContacts: function (contactData, leadIDs, options, success, error) {
            return request('editBulkContacts', {
                params: { contactData: JSON.stringify(contactData), leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        assignBulkContactTags: function (tagID, tagName, isAddition, leadIDs, options, success, error) {
            return request('assignBulkContactTags', {
                params: { tagID: tagID, tagName: tagName, isAddition: isAddition, leadIDs: JSON.stringify(leadIDs), options: JSON.stringify(options) },
                success: success,
                error: error,
                loading: 1
            });
        },

        getVisitor: function (trackingID, success, error) {
            return request('getVisitor', {
                params: {trackingID: trackingID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setBlacklistDomains: function (domains, success, error) {
            var domains = JSON.stringify(domains);
            return request('setBlacklistDomains', {
                params: {domains: domains},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteBlacklistDomain: function (domainID, success, error) {
            return request('deleteBlacklistDomain', {
                params: {id: domainID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllSiteCampaigns: function (siteID, success, error) {
            return request('getAllSiteCampaigns', {
                params: {siteID: siteID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadFromTracking: function (trackingID, ip, contactID, success, error) {
            return request('setLeadFromTracking', {
                params: {trackingID: trackingID, ip: ip, contactID: contactID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getZoomCompanyContacts: function (zoomCompanyID, success, error) {
            return request('getZoomCompanyContacts', {
                params: {companyID: zoomCompanyID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Leads
        getLeads: function (offset, isQualified, ownerIDs, success, error) {
            return request('getLeads', {
                params: {offset: offset, isQualified: isQualified, ownerIDs: ownerIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        getContactsForSearch: function (options, success, error) {
            return request('getContactsForSearch', {
                params: {options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        getFilteredLeads: function (offset, search, ownerIDs, startDate, endDate, listID, isQualified, isUnqualified, isContact, isOpen, hasOpportunity, showOnlyUnassignedCampaigns, sortBy, sortDirection, success, error) {
            return request('getFilteredLeads', {
                params: {offset: offset, search: search, ownerIDs: ownerIDs, startDate: startDate, endDate: endDate, listID: listID, isQualified: isQualified, isUnqualified: isUnqualified, isContact: isContact, isOpen: isOpen, hasOpportunity: hasOpportunity, showOnlyUnassignedCampaigns: showOnlyUnassignedCampaigns, sortBy: sortBy, sortDirection: sortDirection},
                success: success,
                error: error,
                loading: 1
            });
        },

        getFilteredLeadsLimited: function (offset, search, ownerIDs, startDate, endDate, listID, isQualified, isUnqualified, isContact, isOpen, hasOpportunity, showOnlyUnassignedCampaigns, sortBy, sortDirection, limit, success, error) {
            return request('getFilteredLeadsLimited', {
                params: {offset: offset, search: search, ownerIDs: ownerIDs, startDate: startDate, endDate: endDate, listID: listID, isQualified: isQualified, isUnqualified: isUnqualified, isContact: isContact, isOpen: isOpen, hasOpportunity: hasOpportunity, showOnlyUnassignedCampaigns: showOnlyUnassignedCampaigns, sortBy: sortBy, sortDirection: sortDirection, limit: limit},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadCommunicationEvents: function (leadIDs, success, error) {
            leadIDs = JSON.stringify(leadIDs);
            return request('getLeadCommunicationEvents', {
                params: {leadIDs: leadIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadCampaign: function (campaignID, leads, success, error) {
            leads = JSON.stringify(leads);
            return request('setLeadCampaign', {
                params: {campaignID: campaignID, leadIDs: leads},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadPreferences: function (leadID, preferences, success, error) {
            return request('setLeadPreferences', {
                params: {leadID: leadID, preferences: preferences},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadScore: function (leadID, score, success, error) {
            return request('setLeadScore', {
                params: {leadID: leadID, score: score},
                success: success,
                error: error
            });
        },

        getMaxLeadScore: function (options, success, error) {
            return request('getMaxLeadScore', {
                params: {options: JSON.stringify(options)},
                success: success,
                error: error
            });
        },

        getLeadScoreForPercentile: function (percentile, success, error) {
            return request('getLeadScoreForPercentile', {
                params: {percentile: percentile},
                success: success,
                error: error
            });
        },

        getLeadScoreRangeBreakdown: function (ranges, decay, success, error) {
            return request('getLeadScoreRangeBreakdown', {
                params: {ranges: JSON.stringify(ranges), decay: decay},
                success: success,
                error: error,
                loading: 1
            });
        },
        rebuildLeadScores: function (success, error) {
            return request('setLeadScoreRescore', {
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteLead: function (leadID, agreement, success, error) {
            return request('deleteLead', {
                params: {leadID: leadID, agreement: agreement},
                success: success,
                error: error,
                loading: 1
            });
        },

        setQualifyLead: function (leadID, success, error) {
            return request('setQualifyLead', {
                params: {leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // CrmSync Setting for SalesForce

        setSalesForceObeyAssignmentRule: function (thirdPartyCredentialsID, setting, success, error) {
            return request('setSalesForceObeyAssignmentRule', {
                params: {thirdPartyCredentialsID: thirdPartyCredentialsID, setting: setting},
                success: success,
                error: error
            });
        },

        setSalesForceTriggerEmailsRule: function (thirdPartyCredentialsID, setting, success, error) {
            return request('setSalesForceTriggerEmailsRule', {
                params: {thirdPartyCredentialsID: thirdPartyCredentialsID, setting: setting},
                success: success,
                error: error
            });
        },

        // Import Settings

        parseCSVHeader: function (header, delimiter, success, error) {
            return request('parseCSVHeader', {
                params: {header: header, delimiter: delimiter},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Forms
        getForms: function (formIDs, options, success, error) {
            var formIDs = formIDs ? JSON.stringify(formIDs) : null;
            var options = JSON.stringify(options);
            return request('getForms', {
                params: {formIDs: formIDs, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFormData: function (
            uuid,
            formName,
            formType,
            formSettings,
            fields,
            redirectURL,
            postbackURL,
            cssURL,
            cssID,
            formButtonID,
            submitLabel,
            defaultLeadStage,
            customThankYouHTML,
            sendConfirmation,
            newForm,
            success,
            error
        ) {
            return request('setFormData', {
                params: {
                    uuid: uuid,
                    formName: formName,
                    formType: formType,
                    formSettings: formSettings,
                    fields: fields,
                    redirectURL: redirectURL,
                    postbackURL: postbackURL,
                    formButtonID: formButtonID,
                    submitLabel: submitLabel,
                    cssURL: cssURL,
                    cssID: cssID,
                    defaultLeadStage: defaultLeadStage,
                    customThankYouHTML: customThankYouHTML,
                    sendConfirmation: sendConfirmation,
                    newForm: newForm
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setCSSData: function (cssID, title, data, type, success, error) {
            return request('setCssData', {
                params: {cssID: cssID, title: title, data: data, type: type},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteCSSData: function (cssID, success, error) {
            return request('deleteCssData', {
                params: {cssID: cssID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFormButton: function (data, formButtonID, formButtonName, success, error) {
            return request('setFormButton', {
                params: {data: JSON.stringify(data), formButtonID: formButtonID, formButtonName: formButtonName},
                success: success,
                error: error,
                loading: 1
            });
        },

        setEmailButton: function (companyProfileID, data, emailButtonID, success, error) {
            return request('setEmailButton', {
                params: {companyProfileID: companyProfileID, data: JSON.stringify(data), emailButtonID: emailButtonID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllEmailButtons: function (companyProfileID, success, error) {
            return request('getAllEmailButtons', {
                params: {companyProfileID: companyProfileID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getFormsForButton: function (formButtonID, success, error) {
            return request('getFormsForButton', {
                params: {formButtonID: formButtonID},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteFormStyle: function (formStyleID, success, error) {
            return request('deleteFormStyle', {
                params: {formStyleID: formStyleID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setComponentFormSettings: function (campaignGUID, isDisplayed, formLabel, success, error) {
            return request('setComponentFormSettings', {
                params: {campaignGUID: campaignGUID, isDisplayed: isDisplayed, formLabel: formLabel},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Emails

        setTemplate: function (templateID, templateObject, success, error) {
            return request('setTemplate', { params: {templateID: templateID, template: JSON.stringify(templateObject)},
                success: success,
                error: error,
                loading: 1
            });
        },

        isValidSendAddress: function (emailAddress, success, error) {
            return request('isValidSendAddress', {
                params: {emailAddress: emailAddress},
                success: success,
                error: error,
                loading: 1
            });
        },

        getVerifiedDomain: function (domain, create, success, error) {
            return request('getVerifiedDomain', {
                params: {domain: domain, create: create},
                success: success,
                error: error,
                loading: 1
            });
        },

        sendDomainVerificationEmail: function (emailAddress, success, error) {
            return request('sendDomainVerificationEmail', {
                params: {emailAddress: emailAddress},
                success: success,
                error: error,
                loading: 1
            });
        },

        setEmail: function (emailID, emailObject, rssObject, templateSettings, success, error) {
            return request('setEmail', {
                params: {
                    emailID: emailID,
                    email: JSON.stringify(emailObject),
                    rss: rssObject ? JSON.stringify(rssObject) : null,
                    templateSettings: JSON.stringify(templateSettings)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        checkEmailsForSendFromOwner: function (emails, success, error) {
            return request('checkEmailsForSendFromOwner', {
                params: {emails: emails},
                success: success,
                error: error,
                loading: 1
            });
        },

        setSendEmailPreview: function (emailAddress, emailHTML, subject, fromName, fromAddress, success, error) {
            return request('setSendEmailPreview', {
                params: {emailAddress: emailAddress, emailHTML: emailHTML, subject: subject, fromName: fromName, fromAddress: fromAddress},
                success: success,
                error: error,
                loading: 1
            });
        },

        // push/delete Pages funnel to AWS servers
        setFunnelPublished: function (funnelID, isPublished, success, error) {
            return request('setFunnelPublished', {
                params: {funnelID: funnelID, isPublished: isPublished},
                success: success,
                error: error,
                loading: 1
            });
        },

        getEmailWidgetPreview: function (emailHTML, success, error) {
            return request('getEmailWidgetPreview', {
                params: {emailHTML: emailHTML},
                success: success,
                error: error,
                loading: 1
            });
        },

        getEmailJobHistory: function (companyID, options, success, error) {
            return request('getEmailJobHistory', {
                params: {
                    companyID: companyID,
                    options: JSON.stringify(options)
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        scheduleEmailJob: function (recipient, email, time, options, success, error) {
            return request('scheduleEmailJob', {
                params: {
                    recipient: JSON.stringify(recipient),
                    email: JSON.stringify(email),
                    time: JSON.stringify(time),
                    options: JSON.stringify(options || {})
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        getDataForEmailScheduleModal: function (toFetch, success, error) {
            return request('getDataForEmailScheduleModal', {
                params: {toFetch: JSON.stringify(toFetch)},
                success: success,
                error: error,
                loading: 1
            });
        },

        setEmailAttachment: function (emailID, url, success, error) {
            return request('setEmailAttachment', {
                params: {emailID: emailID, url: url},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteEmailAttachment: function (emailID, attachmentID, success, error) {
            return request('deleteEmailAttachment', {
                params: {emailID: emailID, attachmentID: attachmentID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getEmailSendAggregates: function (startDate, endDate, options, success, error) {
            var options = JSON.stringify(options);
            return request('getEmailSendAggregates', {
                params: {startDate: startDate, endDate: endDate, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Landing Pages

        setFunnel: function (funnelID, funnel, options, success, error) {
            var funnel = JSON.stringify(funnel);
            var options = JSON.stringify(options);
            return request('setFunnel', {
                params: {funnelID: funnelID, funnel: funnel, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFunnelFromTemplate: function (funnelTemplateID, funnelName, options, success, error) {
            var options = JSON.stringify(options);
            return request('setFunnelFromTemplate', {
                params: {funnelTemplateID: funnelTemplateID, funnelName: funnelName, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getFunnels: function (funnelIDs, options, success, error) {
            var funnelIDs = funnelIDs ? JSON.stringify(funnelIDs) : null;
            var options = JSON.stringify(options);
            return request('getFunnels', {
                params: {funnelIDs: funnelIDs, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getFunnelsByType: function (funnelType, options, success, error) {
            return request('getFunnelsByType', {
                params: {funnelType: funnelType, options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        setArticle: function (articleID, article, options, success, error) {
            var article = JSON.stringify(article);
            var options = JSON.stringify(options);
            return request('setArticle', {
                params: {articleID: articleID, article: article, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getArticles: function (articleIDs, options, success, error) {
            var articleIDs = articleIDs ? JSON.stringify(articleIDs) : null;
            var options = JSON.stringify(options);
            return request('getArticles', {
                params: {articleIDs: articleIDs, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getPageVersionsForFunnel: function (funnelID, success, error) {
            return request('getPageVersionsForFunnel', {
                params: {funnelID: funnelID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getPublishedVersionContent: function (versionID, success, error) {
            return request('getPublishedVersionContent', {
                params: {versionID: versionID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Automation

        addWorkflowsToContactManager: function (newWorkflows, success, error) {
            return request('addWorkflowsToContactManager', {
                params: {newWorkflows: newWorkflows},
                success: success,
                error: error,
                loading: 1
            });
        },

        addListsToContactManager: function (newLists, success, error) {
            return request('addListsToContactManager', {
                params: {newLists: newLists},
                success: success,
                error: error,
                loading: 1
            });
        },

        getTasksForWorkflow: function (workflowID, isActive, success, error) {
            return request('getTasksForWorkflow', {
                params: {workflowID: workflowID, isActive: isActive},
                success: success,
                error: error,
                loading: 1
            });
        },

        setAutomationTask: function (taskID, taskName, isLive, isRunnable, sets, workflows, success, error) {
            return request('setAutomationTask', {
                params: {taskID: taskID, taskName: taskName, isLive: isLive, isRunnable: isRunnable, sets: JSON.stringify(sets), workflows: JSON.stringify(workflows)},
                success: success,
                error: error,
                loading: 1
            });
        },

        setAutomationList: function (listID, listName, listDescription, success, error) {
            return request('setAutomationList', {
                params: {listID: listID, listName: listName, listDescription: listDescription},
                success: success,
                error: error,
                loading: 1
            });
        },

        setWorkflow: function (workflowID, workflowName, scheduleFieldID, workflowEvents, setTestMode, availableInContactManager, repeatable, success, error) {
            return request('setWorkflow', {
                params: {
                    workflowID: workflowID,
                    workflowName: workflowName,
                    scheduleFieldID: scheduleFieldID,
                    workflowEvents: JSON.stringify(workflowEvents),
                    setTestMode: setTestMode,
                    availableInContactManager: availableInContactManager,
                    repeatable: repeatable
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllWorkflowsConcise: function (options, success, error) {
            return request('getAllWorkflowsConcise', {
                params: {options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadFieldExampleData: function (fieldID, success, error) {
            return request('getLeadFieldExampleData', {
                params: {fieldID: fieldID},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteWorkflowMember: function (workflowID, leadID, success, error) {
            return request('deleteWorkflowMember', {
                params: {workflowID: workflowID, leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadMatches: function (term, success, error) {
            return request('getLeadMatches', {
                params: {term: term},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadsForRender: function (term, success, error) {
            return request('getLeadsForRender', {
                params: {term: term},
                success: success,
                error: error,
                loading: 1
            });
        },

        getRelatedLeads: function (leadID, success, error)        {
            return request('getRelatedLeads', {
                params: {leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadsFromList: function (listID, page, offset, success, error) {
            return request('getLeadsFromList', {
                params: {listID: listID, page: page, offset: offset},
                success: success,
                error: error,
                loading: 1
            });
        },

        getListsFromFolder: function (folderID, options, success, error) {
            var options = JSON.stringify(options);
            return request('getListsFromFolder', {
                params: {folderID: folderID, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllLists: function (options, success, error) {
            return request('getAllLists', {
                params: {options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        getListMembers: function (listID, limit, isRemoved, success, error) {
            return request('getListMembers', {
                params: {listID: listID, limit: limit, isRemoved: isRemoved},
                success: success,
                error: error,
                loading: 1
            });
        },

        getListMemberMatches: function (listID, term, isRemoved, isManuallyAdded, limit, success, error) {
            return request('getListMemberMatches', {
                params: {listID: listID, term: term, limit: limit, isRemoved: isRemoved, isManuallyAdded: isManuallyAdded},
                success: success,
                error: error,
                loading: 1
            });
        },

        setListMember: function (listID, leadID, success, error) {
            return request('setListMember', {
                params: {listID: listID, leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        removeListMember: function (listID, memberID, success, error) {
            return request('removeListMember', {
                params: {listID: listID, memberID: memberID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setUnsubscribeLeadsInList: function (listID, success, error) {
            return request('setUnsubscribeLeadsInList', {
                params: {listID: listID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Utils
        setIntroVideoToggle: function (hideIntroOnStart, success, error) {
            return request('setIntroVideoToggle', {
                params: {hideIntroOnStart: hideIntroOnStart},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFlash: function (key, value, success, error) {
            return request('setFlash', {
                params: {key: key, value: value},
                success: success,
                error: error,
                loading: 1
            });
        },

        setSession: function (key, value, success, error) {
            return request('setSession', {
                params: {key: key, value: value},
                success: success,
                error: error,
                loading: 1
            });
        },

        getSimilarLeads: function (firstName, lastName, emailAddress, success, error) {
            return request('getSimilarLeads', {
                params: {firstName: firstName, lastName: lastName, emailAddress: emailAddress},
                success: success,
                error: error,
                loading: 1
            });
        },

        updateLead: function (leadID, success, error) {
            return request('updateLead', {
                params: {leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        createNewContact: function (sourceLeadID, firstName, lastName, emailAddress, extraFields, success, error) {
            var fields = JSON.stringify(extraFields);
            return request('createNewContact', {
                params: {sourceLeadID: sourceLeadID, firstName: firstName, lastName: lastName, emailAddress: emailAddress, fields: fields},
                success: success,
                error: error,
                loading: 1
            });
        },

        setNewNote: function (title, note, whoType, whoID, whatType, whatID, recipientID, success, error) {
            return request('setNewNote', {
                params: {title: title, note: note, whoType: whoType, whoID: whoID, whatType: whatType, whatID: whatID, recipientID: recipientID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getNotes: function (whoType, whoID, whatType, whatID, success, error) {
            return request('getNotes', {
                params: {whoType: whoType, whoID: whoID, whatType: whatType, whatID: whatID },
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Field */
        setField: function (id,
            label,
            dataType,
            picklist,
            isAvailableInForms,
            isAvailableInContactManager,
            isEditableInContactManager,
            isMergeVariable,
            isRequired,
            relationship,
            useFilters,
            visiblePipelines,
            defaultPlaceholder,
            format,
            success,
            error
        ) {
            return request('setField', {
                params: {
                    id: id,
                    label: label,
                    dataType: dataType,
                    picklist: JSON.stringify(picklist),
                    isAvailableInForms: isAvailableInForms,
                    isAvailableInContactManager: isAvailableInContactManager,
                    isEditableInContactManager: isEditableInContactManager,
                    isMergeVariable: isMergeVariable,
                    isRequired: isRequired,
                    relationship: relationship,
                    useFilters: useFilters,
                    visiblePipelines: visiblePipelines.join(','),
                    defaultPlaceholder: defaultPlaceholder,
                    format: format
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Products */
        setProduct: function (id, productName, productType, pipelineID, itemCode, productURL, category, price, description, imageFile, success, error) {
            return request('setProduct', {
                params: {id: id, productName: productName, productType: productType, pipelineID: pipelineID, itemCode: itemCode, productURL: productURL, category: category, price: price, description: description},
                success: success,
                error: error,
                loading: 1,
                files: {imageFile: imageFile}
            });
        },

        getProducts: function (isActive, success, error) {
            return request('getProducts', {
                params: {isActive: isActive},
                success: success,
                error: error,
                loading: 1,
                cache: 5 * 60 * 1000
            });
        },

        getOppProducts: function (opportunityID, success, error) {
            return request('getOppProducts', {
                params: {opportunityID: opportunityID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setOppProduct: function (opportunityID, productID, quantity, pricePer, useProductPrice, success, error) {
            return request('setOppProduct', {
                params: {opportunityID: opportunityID, productID: productID, quantity: quantity, pricePer: pricePer, useProductPrice: useProductPrice},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteOppProduct: function (oppProductID, success, error) {
            return request('deleteOppProduct', {
                params: {oppProductID: oppProductID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getTransactions: function (startDate, endDate, offset, success, error) {
            return request('getTransactions', {
                params: {startDate: startDate, endDate: endDate, offset: offset},
                success: success,
                error: error,
                loading: 1
            });
        },

        getMaxOppValue: function (options, success, error) {
            return request('getMaxOppValue', {
                params: {options: JSON.stringify(options)},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Event Queue */
        setEventQueueProcessed: function (eventQueueID, success, error) {
            return request('setEventQueueProcessed', {
                params: {eventQueueID: eventQueueID},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Deals Requests */
        getPipelines: function (pipelineType, success, error) {
            return request('getPipelines', {
                params: {pipelineType: pipelineType},
                success: success,
                error: error,
                loading: 1,
                cache: 60 * 1000
            });
        },

        getOpps: function (oppIDs, status, startDate, endDate, dealStageID, offset, ownerID, search, success, error) {
            return request('getOpps', {
                params: {oppIDs: oppIDs, startDate: startDate, endDate: endDate, dealStageID: dealStageID, status: status, offset: offset, ownerID: ownerID, search: search},
                success: success,
                error: error,
                loading: 1,
                cache: (oppIDs ? 0 : 1 * 60 * 1000)
            });
        },

        setLeadOwner: function (ownerID, leads, success, error) {
            leads = JSON.stringify(leads);
            return request('setLeadOwner', {
                params: {ownerID: ownerID, leadIDs: leads},
                success: success,
                error: error,
                loading: 1
            });
        },

        setOpportunity: function (id, opportunityName, closeDate, description, accountName, accountID, ownerID, leadIDs, campaignID, amount, probability, dealStageID, isWon, isClosed, originatingLeadID, reassignLead, isActive, settings, products, customFields, success, error) {
            products = JSON.stringify(products);
            customFields = customFields ? JSON.stringify(customFields) : null;
            return request('setOpportunity', {
                params: {opportunityID: id, opportunityName: opportunityName, closeDate: closeDate, description: description, accountName: accountName, accountID: accountID, ownerID: ownerID, leadIDs: leadIDs, campaignID: campaignID, amount: amount, probability: probability, dealStageID: dealStageID, isWon: isWon, isClosed: isClosed, originatingLeadID: originatingLeadID, reassignLead: reassignLead, isActive: isActive, settings: settings, products: products, customFields: customFields},
                success: success,
                error: error,
                loading: 1
            });
        },

        getOppFields: function (opportunityID, success, error) {
            return request('getOppFields', {
                params: {opportunityID: opportunityID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setOppFields: function (opportunityID, fieldValues, success, error) {
            fieldValues = JSON.stringify(fieldValues);
            return request('setOppFields', {
                params: {opportunityID: opportunityID, fieldValues: fieldValues},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLead: function (leadID, success, error) {
            return request('getLead', {
                params: {leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadMemberships: function (leadID, success, error) {
            return request('getLeadMemberships', {
                params: {leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadTimeline: function (leadID, settings, success, error) {
            settings = JSON.stringify(settings);
            return request('getLeadTimeline', {
                params: {leadID: leadID, settings: settings},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteEventFromTimeline: function (leadID, whatID, eventID, eventType, success, error) {
            return request('deleteEventFromTimeline', {
                params: {leadID: leadID, whatID: whatID, eventID: eventID, eventType: eventType},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadsByIDs: function (leadIDs, success, error) {
            leadIDs = leadIDs.join(',');
            return request('getLeadsByIDs', {
                params: {leadIDs: leadIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        /* Accounts */
        getAccounts: function (offset, options, success, error) {
            options = JSON.stringify(options);
            return request('getAccounts', {
                params: {offset: offset, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAllAccountNames: function (options, success, error) {
            options = JSON.stringify(options);
            return request('getAllAccountNames', {
                params: {options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        removeLeadFromAccount: function (leadID, success, error) {
            return request('removeLeadFromAccount', {
                params: {leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadsThatMatchAccount: function (accountID, accountName, domainName, success, error) {
            return request('getLeadsThatMatchAccount', {
                params: {accountID: accountID, accountName: accountName, domainName: domainName},
                success: success,
                error: error,
                loading: 1
            });
        },

        setOpportunityDealStage: function (opportunityID, currentDealStageID, dealStageID, probability, success, error) {
            return request('setOpportunityDealStage', {
                params: {opportunityID: opportunityID, currentDealStageID: currentDealStageID, dealStageID: dealStageID, probability: probability},
                success: success,
                error: error,
                loading: 1
            });
        },

        setDealStage: function (dealStageID, dealStageName, description, defaultProbability, weight, isEditable, daysBetweenCalls, daysBetweenEmails, pipelineID, success, error) {
            return request('setDealStage', {
                params: {dealStageID: dealStageID, dealStageName: dealStageName, description: description, defaultProbability: defaultProbability, weight: weight, isEditable: isEditable, daysBetweenCalls: daysBetweenCalls, daysBetweenEmails: daysBetweenEmails, pipelineID: pipelineID},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteDealStage: function (dealStageID, newDealStageID, agreement, success, error) {
            return request('deleteDealStage', {
                params: {dealStageID: dealStageID, newDealStageID: newDealStageID, agreement: agreement},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadOnOpportunity: function (leadID, opportunityID, operation, overwriteLeadOwner, success, error) {
            return request('setLeadsToOpportunity', {
                params: {opportunityID: opportunityID, leadID: leadID, overwriteLeadOwners: overwriteLeadOwners, operation: operation},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadsToOpportunity: function (leadIDs, opportunityID, overwriteLeadOwners, success, error) {
            return request('setLeadsToOpportunity', {
                params: {opportunityID: opportunityID, leadIDs: leadIDs, overwriteLeadOwners: overwriteLeadOwners},
                success: success,
                error: error,
                loading: 1
            });
        },

        setPrimaryLeadToOpportunity: function (leadID, opportunityID, success, error) {
            return request('setPrimaryLeadToOpportunity', {
                params: {opportunityID: opportunityID, leadID: leadID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getFieldForLeads: function (fieldID, leadIDs, success, error) {
            var leadIDs = leadIDs.join(',');
            return request('getFieldForLeads', {
                params: {fieldID: fieldID, leadIDs: leadIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadGroupFields: function (fieldID, leadValues, success, error) {
            return request('setLeadGroupFields', {
                params: {fieldID: fieldID, leadValues: JSON.stringify(leadValues)},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadsForEmailReport: function (emailIDs, jobIDs, eventType, filterHash, offset, limit, listIDs, success, error) {
            return request('getLeadsForEmailReport', {
                params: {
                    emailIDs: _.isArray(emailIDs) ? emailIDs.join(',') : emailIDs,
                    emailJobIDs: _.isArray(jobIDs) ? jobIDs.join(',') : null,
                    eventType: eventType,
                    filterHash: filterHash,
                    offset: offset,
                    limit: limit,
                    listIDs: _.isArray(listIDs) ? listIDs.join(',') : null
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        // Pipelines
        setPipeline: function (pipelineID, pipelineName, description, type, amountType, itemIDs, success, error) {
            return request('setPipeline', {
                params: {pipelineID: pipelineID, name: pipelineName, description: description, type: type, amountType: amountType,  itemIDs: itemIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        deletePipeline: function (pipelineID, success, error) {
            return request('deletePipeline', {
                params: {pipelineID: pipelineID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Folders
        getFolders: function (folderIDs, type, options, success, error) {
            folderIDs = folderIDs ? JSON.stringify(folderIDs) : null;
            options = JSON.stringify(options);
            return request('getFolders', {
                params: {folderIDs: folderIDs, type: type, options: options},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFolder: function (folderID, type, folderName, itemIDs, success, error) {
            return request('setFolder', {
                params: {folderID: folderID, type: type, name: folderName, itemIDs: itemIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteFolder: function (folderID, success, error) {
            return request('deleteFolder', {
                params: {folderID: folderID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFolderOrder: function (folderType, folderIDs, success, error) {
            return request('setFolderOrder', {
                params: {folderType: folderType, folderIDs: folderIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFolderItem: function (type, folderID, itemIDs, success, error) {
            return request('setFolderItem', {
                params: {type: type, itemIDs: itemIDs, folderID: folderID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFolderItemOrder: function (type, folderID, itemIDs, success, error) {
            return request('setFolderItemOrder', {
                params: {type: type, itemIDs: itemIDs, folderID: folderID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // App/Page State
        setAppState: function (context, state, success, error) {
            var data = JSON.stringify(state);
            return request('setAppState', {
                params: {context: context, data: data},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAppState: function (context, success, error) {
            return request('getAppState', {
                params: {context: context},
                success: success,
                error: error,
                loading: 1
            });
        },

        setReport: function (reportID, title, criteria, uri, context, ownerID, folderID, reportData, success, error) {
            criteria = JSON.stringify(criteria);
            return request('setReport', {
                params: {title: title, criteria: criteria, uri: uri, context: context, ownerID: ownerID, reportID: reportID, folderID: folderID, reportData: reportData},
                success: success,
                error: error,
                loading: 1
            });
        },

        setReportActive: function (reportID, active, remove, success, error) {
            return request('setReportActive', {
                params: {reportID: reportID, active: active, remove: remove},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Set Active Flags
        setFormsActive: function (formIDs, active, success, error) {
            return request('setFormsActive', {
                params: {formIDs: formIDs, active: active},
                success: success,
                error: error,
                loading: 1
            });
        },

        setCampaignsActive: function (campaignIDs, active, success, error) {
            return request('setCampaignsActive', {
                params: {campaignIDs: campaignIDs, active: active},
                success: success,
                error: error,
                loading: 1
            });
        },

        getLeadFields: function (leadID, isCustom, isAvailableInContactManager, success, error) {
            return request('getLeadFields', {
                params: {leadID: leadID, isCustom: isCustom, isAvailableInContactManager: isAvailableInContactManager},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadFields: function (leadID, fieldValues, filterBlanks, success, error) {
            var fieldValues = JSON.stringify(fieldValues);
            return request('setLeadFields', {
                params: {leadID: leadID, fieldValues: fieldValues, filterBlanks: filterBlanks},
                success: success,
                error: error,
                loading: 1
            });
        },

        setOptInStatus: function (leadID, optIn, success, error) {
            return request('setOptInStatus', {
                params: {leadID: leadID, optIn: optIn},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadStatus: function (leadID, status, success, error) {
            return request('setLeadStatus', {
                params: {leadID: leadID, status: status},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Tasks
        setUserTask: function (id, task, success, error) {
            var data = JSON.stringify(task);
            return request('setUserTask', {
                params: {id: id, data: data},
                success: success,
                error: error,
                loading: 1
            });
        },

        sendUserTaskInvites: function (taskID, emails, success, error) {
            var emails = emails.length ? emails.join(',') : emails;
            return request('sendUserTaskInvites', {
                params: {taskID: taskID, emails: emails},
                success: success,
                error: error,
                loading: 0
            });
        },

        setNoteForTask: function (taskID, note, success, error) {
            return request('setNoteForTask', {
                params: {taskID: taskID, note: note},
                success: success,
                error: error,
                loading: 1
            });
        },

        getUserStats: function (userID, options, success, error) {
            options = JSON.stringify(options);
            return request('getUserStats', {
                params: {userID: userID, options: options},
                success: success,
                error: error,
                loading: 1,
                cache: 10000
            });
        },

        getOppSummary: function (startDate, endDate, options, success, error) {
            options = JSON.stringify(options);
            return request('getOppSummary', {
                params: {startDate: startDate, endDate: endDate, options: options},
                success: success,
                error: error,
                loading: 1,
                cache: 10000
            });
        },

        getLeadsRecentlyAssigned: function (userID, options, success, error) {
            options = JSON.stringify(options);
            return request('getLeadsRecentlyAssigned', {
                params: {userID: userID, options: options},
                success: success,
                error: error,
                loading: 1,
                cache: 10000
            });
        },

        getUserTasks: function (whoID, whoType, whatID, whatType, isClosed, success, error) {
            return request('getUserTasks', {
                params: {whoID: whoID, whoType: whoType, whatID: whatID, whatType: whatType},
                success: success,
                error: error,
                loading: 1,
                cache: 10000
            });
        },

        getUserTasksByUser: function (taskID, userID, success, error) {
            return request('getUserTasksByUser', {
                params: {userID: userID, taskID: taskID},
                success: success,
                error: error,
                loading: 1,
                cache: 10000
            });
        },

        setCloseUserTask: function (taskID, note, success, error) {
            return request('setCloseUserTask', {
                params: {taskID: taskID, note: note},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteUserTask: function (id, success, error) {
            return request('deleteUserTask', {
                params: {id: id},
                success: success,
                error: error,
                loading: 1
            });
        },

        setPhoneCall: function (leadID, direction, callResult, callNote, success, error) {
            return request('setPhoneCall', {
                params: {leadID: leadID, direction: direction, callResult: callResult, callNote: callNote},
                success: success,
                error: error,
                loading: 1
            });
        },

        editPhoneCall: function (noteID, leadID, direction, callResult, callNote, success, error) {
            return request('editPhoneCall', {
                params: {noteID: noteID, leadID: leadID, direction: direction, callResult: callResult, callNote: callNote},
                success: success,
                error: error,
                loading: 1
            });
        },

        deletePhoneCall: function (noteID, confirmation, success, error) {
            return request('deletePhoneCall', {
                params: {noteID: noteID, confirm: confirmation},
                success: success,
                error: error,
                loading: 1
            });
        },

        getOppNotes: function (oppID, success, error) {
            return request('getOppNotes', {
                params: {oppID: oppID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getOppsRelatedToLead: function (leadID, type, success, error) {
            return request('getOppsRelatedToLead', {
                params: {leadID: leadID, type: type},
                success: success,
                error: error,
                loading: 1
            });
        },

        getOppsSimilarDomain: function (emailAddress, success, error) {
            return request('getOppsSimilarDomain', {
                params: {emailAddress: emailAddress},
                success: success,
                error: error,
                loading: 1
            });
        },

        setResellerLockOut: function (success, error) {
            return request('setResellerLockOut', {
                success: success,
                error: error,
                loading: 1
            });
        },

        setReadReceipt: function (whatType, whatID, readByUserID, success, error) {
            return request('setReadReceipt', {
                params: {whatID: whatID, whatType: whatType, readByUserID: readByUserID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setNewFolderName: function (folderID, folderName, success, error) {
            return request('setNewFolderName', {
                params: {folderID: folderID, folderName: folderName},
                success: success,
                error: error,
                loading: 1
            });
        },

        setNewNoteContent: function (noteID, noteContent, success, error) {
            return request('setNewNoteContent', {
                params: {noteID: noteID, noteContent: noteContent},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteNote: function (noteID, confirm, success, error) {
            return request('deleteNote', {
                params: {noteID: noteID, confirm: confirm},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadTextarea: function (leadID, fieldName, fieldValue, success, error) {
            return request('setLeadTextarea', {
                params: {leadID: leadID, fieldName: fieldName, fieldValue: fieldValue},
                success: success,
                error: error,
                loading: 1
            });
        },

        setTag: function (objectType, objectID, tagID, success, error) {
            return request('setTag', {
                params: {objectID: objectID, tag: tagID, objectType: objectType},
                success: success,
                error: error
            });
        },

        getTagsByType: function (type, options, success, error) {
            return request('getTagsByType', {
                params: { type: type, options: JSON.stringify(options) },
                success: success,
                error: error
            });
        },

        deleteTag: function (objectType, objectID, tagID, success, error) {
            return request('deleteTag', {
                params: {objectID: objectID, tagID: tagID, objectType: objectType},
                success: success,
                error: error,
                loading: 1
            });
        },

        setMergedContact: function (leftLeadID, rightLeadID, mergedFields, success, error) {
            return request('setMergedContact', {
                params: {leftLeadID: leftLeadID, rightLeadID: rightLeadID, mergedFields: mergedFields},
                success: success,
                error: error,
                loading: 1
            });
        },

        getManagingCompany: function (companyID, success, error) {
            return request('getManagingCompany', {
                params: {companyID: companyID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setABTest: function (testName, listID, baselineID, useBaseline, abTestEmails, immediate, date, hour, minute, hourOffset, success, error) {
            abTestEmails = JSON.stringify(abTestEmails);
            return request('setABTest', {
                params: {testName: testName, listID: listID, baselineID: baselineID, useBaseline: useBaseline, abTestEmails: abTestEmails, immediate: immediate, date: date, hour: hour, minute: minute, hourOffset: hourOffset},
                success: success,
                error: error,
                loading: 1
            });
        },

        getAbTestAccountStatus: function (success, error) {
            return request('getAbTestAccountStatus', {
                params: {},
                success: success,
                error: error,
                loading: 1
            });
        },

        setLeadSharingProgram: function (companyID, enroll, success, error) {
            return request('setLeadSharingProgram', {
                params: {companyID: companyID, enroll: enroll},
                success: success,
                error: error,
                loading: 1
            });
        },

        setCompanyProfile: function (companyID, company, success, error) {
            company = JSON.stringify(company);
            return request('setCompanyProfile', {
                params: {companyID: companyID, company: company},
                success: success,
                error: error,
                loading: 1
            });
        },

        assignClientToAgency: function (clientID, agencyID, success, error) {
            return request('assignClientToAgency', {
                params: {clientID: clientID, agencyID: agencyID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setCompanyNoteworthy: function (companyID, noteworthy, success, error) {
            return request('setCompanyNoteworthy', {
                params: {companyID: companyID, noteworthy: noteworthy},
                success: success,
                error: error,
                loading: 1
            });
        },

        // Webex
        getWebexPicklist: function (fieldID, success, error) {
            return request('getWebexPicklist', {
                params: {fieldID: fieldID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getGoToWebinarPicklist: function (fieldID, success, error) {
            return request('getGoToWebinarPicklist', {
                params: {fieldID: fieldID},
                success: success,
                error: error,
                loading: 1
            });
        },

        // CallerID

        getCalls: function (success, error) {
            return request('getCalls', {
                params: {},
                success: success,
                error: error,
                loading: 1
            });
        },

        getCallMatches: function (callID, success, error) {
            return request('getCallMatches', {
                params: {callID: callID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setCallMatch: function (callID, userTrackingID, lead, success, error) {
            var lead = JSON.stringify(lead);
            return request('setCallMatch', {
                params: {callID: callID, userTrackingID: userTrackingID, lead: lead},
                success: success,
                error: error,
                loading: 1
            });
        },

        getCallReps: function (success, error) {
            return request('getCallReps', {
                params: {},
                success: success,
                error: error,
                loading: 1,
                cache: 5 * 60 * 1000
            });
        },

        setCallRepStatus: function (isTakingCalls, success, error) {
            return request('setCallRepStatus', {
                params: {isTakingCalls: isTakingCalls},
                success: success,
                error: error,
                loading: 0
            });
        },

        setProvisionNumbers: function (pools, plan, payingParty, campaignIDs, success, error) {
            return request('setProvisionNumbers', {
                params: {pools: JSON.stringify(pools), plan: JSON.stringify(plan), payingParty: payingParty, campaignIDs: campaignIDs},
                success: success,
                error: error,
                loading: 1
            });
        },
        setProvisionExtraNumbers: function (numbersToProvision, success, error) {
            return request('setProvisionExtraNumbers', {
                params: {numbersToProvision: numbersToProvision},
                success: success,
                error: error,
                loading: 1
            });
        },
        setUnprovisionNumbers: function (unassignedNumbers, campaignNumbers, success, error) {
            return request('setUnprovisionNumbers', {
                params: {unassignedNumbers: unassignedNumbers, campaignNumbers: campaignNumbers},
                success: success,
                error: error,
                loading: 1
            });
        },
        getSuggestedPlans: function (campaignIDs, success, error) {
            campaignIDs = JSON.stringify(campaignIDs);
            return request('getSuggestedPlans', {
                params: {campaignIDs: campaignIDs},
                success: success,
                error: error,
                loading: 1
            });
        },

        setUserActivity: function (success, error) {
            return request('setUserActivity', {
                params: {},
                success: success,
                error: error,
                loading: 0
            });
        },

        getRenderTest: function (previewID, success, error) {
            return request('getRenderTest', {
                params: {previewID: previewID},
                success: success,
                error: error
            });
        },

        createRenderTest: function (params, success, error) {
            return request('createRenderTest', {
                params: params,
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteTask: function (taskID, confirm, success, error) {
            return request('deleteTask', {
                params: {taskID: taskID, confirm: confirm},
                success: success,
                error: error,
                loading: 1
            });
        },

        setFormCustomThankYou: function (formID, customThankYouHTML, success, error) {
            return request('setFormCustomThankYou', {
                params: {formID: formID, customThankYouHTML: customThankYouHTML},
                success: success,
                error: error,
                loading: 1
            });
        },

        addLeadToList: function (leadID, listID, success, error) {
            return request('addLeadToList', {
                params: {leadID: leadID, listID: listID},
                success: success,
                error: error
            });
        },

        setWhiteLabelDomain: function (domainName, success, error) {
            return request('setWhiteLabelDomain', {
                params: {domainName: domainName},
                success: success,
                error: error,
                loading: 1
            });
        },

        // File Uploads

        setUploadLeadField: function (leadID, fieldID, file, success, error) {
            var files = {};
            files['field_' + fieldID] = file;
            return request('setUploadLeadField', {
                params: {fieldID: fieldID, leadID: leadID},
                success: success,
                error: error,
                files: files
            });
        },

        deleteLeadFileUpload: function (leadID, fieldID, success, error) {
            return request('deleteLeadFileUpload', {
                params: {fieldID: fieldID, leadID: leadID},
                success: success,
                error: error
            });
        },

        setUploadAccountField: function (accountID, fieldID, file, success, error) {
            var files = {};
            files['field_' + fieldID] = file;
            return request('setUploadAccountField', {
                params: {fieldID: fieldID, accountID: accountID},
                success: success,
                error: error,
                files: files
            });
        },

        deleteAccountFileUpload: function (accountID, fieldID, success, error) {
            return request('deleteAccountFileUpload', {
                params: {fieldID: fieldID, accountID: accountID},
                success: success,
                error: error
            });
        },

        setUploadOpportunityField: function (opportunityID, fieldID, file, success, error) {
            var files = {};
            files['field_' + fieldID] = file;
            return request('setUploadOpportunityField', {
                params: {fieldID: fieldID, opportunityID: opportunityID},
                success: success,
                error: error,
                files: files
            });
        },

        deleteOpportunityFileUpload: function (opportunityID, fieldID, success, error) {
            return request('deleteOpportunityFileUpload', {
                params: {fieldID: fieldID, opportunityID: opportunityID},
                success: success,
                error: error
            });
        },

        getLeadEmailExists: function (emailAddress, leadID, success, error) {
            return request('getLeadEmailExists', {
                params: {emailAddress: emailAddress, leadID: leadID},
                success: success,
                error: error
            });
        },

        setTemplatePublic: function (templateID, isPublic, success, error) {
            return request('setTemplatePublic', {
                params: {templateID: templateID, isPublic: isPublic},
                success: success,
                error: error
            });
        },

        getEmailAccountStatus: function (listID, tagID, emailID, time, success, error) {
            return request('getEmailAccountStatus', {
                params: {
                    listID: listID ? listID : 0,
                    tagID: tagID ? tagID : 0,
                    emailID: emailID,
                    time: time
                },
                success: success,
                error: error
            });
        },

        createPOFile: function (locale, phrases, success, error) {
            phrases = JSON.stringify(phrases);

            return request('createPOFile', {
                params: {locale: locale, phrases: phrases},
                success: success,
                error: error
            });
        },

        getLeadsByEmailAddresses: function (contacts, success, error) {
            return request('getLeadsByEmailAddresses', {
                params: {contacts: contacts},
                success: success,
                error: error
            });
        },

        createEmailMessage: function (fromName, fromAddress, to, CCs, subject, body, trackingCode, success, error) {
            return request('createEmailMessage', {
                params: {
                    fromName: fromName,
                    fromAddress: fromAddress,
                    to: to,
                    CCs: CCs,
                    subject: subject,
                    body: body,
                    trackingCode: trackingCode
                },
                success: success,
                error: error
            });
        },

        getEmailTrackingURL: function (success, error) {
            return request('getEmailTrackingURL', {
                params: {},
                success: success,
                error: error
            });
        },

        getTwilioNumberMatches: function (numberType, countryCode, contains, success, error) {
            return request('getTwilioNumberMatches', {
                params: {numberType: numberType, countryCode: countryCode, contains: contains},
                success: success,
                error: error
            });
        },

        getClientPlanData: function (companyID, success, error) {
            return request('getClientPlanData', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        submitJiraTicket: function (ticket, success, error) {
            ticket = JSON.stringify(ticket);
            return request('submitJiraTicket', {
                params: {ticket: ticket},
                success: success,
                error: error
            });
        },

        sendSupportTicket: function (ticket, screenshots, success, error) {
            ticket = JSON.stringify(ticket);
            return request('sendSupportTicket', {
                params: {ticket: ticket},
                success: success,
                error: error,
                files: screenshots
            });
        },

        reverseEmailLookup: function (email, success, error) {
            return request('reverseEmailLookup', {
                params: {email: email},
                success: success,
                error: error
            });
        },

        sendReferral: function (contactPhone, contactName, contactEmail, contactCompany, success, error) {
            return request('sendReferral', {
                params: {contactPhone: contactPhone, contactName: contactName, contactEmail: contactEmail, contactCompany: contactCompany},
                success: success,
                error: error
            });
        },

        deleteClientPlanTier: function (companyID, tierID, success, error) {
            return request('deleteClientPlanTier', {
                params: {companyID: companyID, tierID: tierID},
                success: success,
                error: error
            });
        },
        setJiraIssueRank: function (key, prevKey, nextKey, success, error) {
            return request('setJiraIssueRank', {
                params: {key: key, prevKey: prevKey, nextKey: nextKey},
                success: success,
                error: error
            });
        },
        setClientPlan: function (companyID, firstServicePayment, plan, tiers, credit, scheduledCharges, companySetupInfo, chargeNow, success, error) {
            return request('setClientPlan', {
                params: {companyID: companyID, firstServicePayment: firstServicePayment, plan: plan, tiers: tiers, credit: credit, scheduledCharges: scheduledCharges, companySetupInfo: companySetupInfo, chargeNow: chargeNow},
                success: success,
                error: error,
                loading: 1
            });
        },

        setJiraIssueCategory: function (key, category, success, error) {
            return request('setJiraIssueCategory', {
                params: {key: key, category: category},
                success: success,
                error: error
            });
        },

        getJiraIssueFields: function (key, success, error) {
            return request('getJiraIssueFields', {
                params: {key: key},
                success: success,
                error: error,
                loading: 1
            });
        },

        setJiraIssueFields: function (key, fields, success, error) {
            return request('setJiraIssueFields', {
                params: {key: key, fields: JSON.stringify(fields)},
                success: success,
                error: error,
                loading: 1
            });
        },

        setEmailSettings: function (emailVariables, success, error) {
            emailVariables = JSON.stringify(emailVariables);
            return request('setEmailSettings', {
                params: {emailVariables: emailVariables},
                success: success,
                error: error,
                loading: 1
            });
        },

        clearThirdPartySyncExclusions: function (toClear, thirdPartyID, success, error) {
            if (_.isArray(toClear)) {
                toClear = toClear.join(',');
            }
            return request('clearThirdPartySyncExclusions', {
                params: {toClear: toClear, thirdPartyID: thirdPartyID},
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteList: function (listID, success, error) {
            return request('deleteList', {
                params: {listID: listID},
                success: success,
                error: error
            });
        },

        deleteGoToWebinarCredentials: function (success, error) {
            return request('deleteGoToWebinarCredentials', {
                success: success,
                error: error
            });
        },

        setUnsubscribeCategory: function (label, success, error) {
            return request('setUnsubscribeCategory', {
                params: {label: label},
                success: success,
                error: error
            });
        },

        deleteUnsubscribeCategory: function (categoryID, success, error) {
            return request('deleteUnsubscribeCategory', {
                params: {categoryID: categoryID},
                success: success,
                error: error
            });
        },

        resubscribeToCategory: function (categoryID, leadID, success, error) {
            return request('resubscribeToCategory', {
                params: {categoryID: categoryID, leadID: leadID},
                success: success,
                error: error
            });
        },

        renameUnsubscribeCategory: function (categoryID, label, success, error) {
            return request('renameUnsubscribeCategory', {
                params: {categoryID: categoryID, label: label},
                success: success,
                error: error
            });
        },

        getAuthEndpoint: function (companyID, success, error) {
            return request('getAuthEndpoint', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        getCompanyEndpoint: function (companyID, success, error) {
            return request('getCompanyEndpoint', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        getCompanyEmailAccountStatus: function (companyID, clusterID, success, error) {
            return request('getCompanyEmailAccountStatus', {
                params: { companyID: companyID, clusterID: clusterID },
                success: success,
                error: error,
                loading: 1
            });
        },

        setCompanyEmailAccountStatus: function (companyID, clusterID, status, success, error) {
            return request('setCompanyEmailAccountStatus', {
                params: { companyID: companyID, clusterID: clusterID, status: status },
                success: success,
                error: error,
                loading: 1
            });
        },

        getCoordinatesForCompany: function (companyID, clusterID, success, error) {
            return request('getCoordinatesForCompany', {
                params: {companyID: companyID, clusterID: clusterID},
                success: success,
                error: error
            });
        },

        setCoordinatesForCompany: function (companyID, clusterID, latitude, longitude, success, error) {
            return request('setCoordinatesForCompany', {
                params: {companyID: companyID, clusterID: clusterID, latitude: latitude, longitude: longitude},
                success: success,
                error: error
            });
        },

        getCompanyData: function (companyID, success, error) {
            return request('getCompanyData', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        // Media
        getMedia: function (mediaIDs, options, success, error) {
            var mediaIDs = mediaIDs && mediaIDs.length ? mediaIDs.join(',') : null;
            var options = JSON.stringify(options);
            return request('getMedia', {
                params: {mediaIDs: mediaIDs, options: options},
                success: success,
                error: error
            });
        },

        setMedia: function (id, asset, file, success, error, uploadProgress) {
            var media = JSON.stringify(asset);
            return request('setMedia', {
                params: {mediaID: id, media: media},
                success: success,
                error: error,
                files: { mediaFile: file },
                uploadProgress: uploadProgress
            });
        },

        requestShutterstockImage: function (id, subscriptionID, success, error) {
            return request('requestShutterstockImage', {
                params: { mediaID: id, subscriptionID: subscriptionID },
                success: success,
                error: error
            });
        },

        getUnseenMediaByLead: function (leadID, isAvailableInContactManager, success, error) {
            return request('getUnseenMediaByLead', {
                params: {leadID: leadID, isAvailableInContactManager: isAvailableInContactManager},
                success: success,
                error: error
            });
        },

        setMediaLink: function (linkID, mediaID, linkData, success, error) {
            var linkData = JSON.stringify(linkData);
            return request('setMediaLink', {
                params: {linkID: linkID, mediaID: mediaID, linkData: linkData},
                success: success,
                error: error
            });
        },

        getMediaStats: function (mediaID, settings, success, error) {
            settings = JSON.stringify(settings);
            return request('getMediaStats', {
                params: {mediaID: mediaID, settings: settings},
                success: success,
                error: error
            });
        },

        setBanTrackingID: function (companyID, leadID, trackingID, ban, success, error) {
            return request('setBanTrackingID', {
                params: {companyID: companyID, leadID: leadID, trackingID: trackingID, ban: ban},
                success: success,
                error: error
            });
        },

        getGenericProductPlan: function (companyID, success, error) {
            return request('getGenericProductPlan', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        setTerminationRequest: function (companyID, requestID, requestDate, terminationDate, notes, success, error) {
            return request('setTerminationRequest', {
                params: {companyID: companyID, requestID: requestID, requestDate: requestDate, terminationDate: terminationDate, notes: notes},
                success: success,
                error: error
            });
        },

        removeTerminationRequest: function (companyID, success, error) {
            return request('removeTerminationRequest', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        setGenericProductPlan: function (companyID, planID, planItems, nextChargeDate, success, error) {
            return request('setGenericProductPlan', {
                params: {companyID: companyID, planID: planID, planItems: planItems, nextChargeDate: nextChargeDate},
                success: success,
                error: error
            });
        },

        getWidgets: function (userID, options, success, error) {
            options = JSON.stringify(options);
            return request('getWidgets', {
                params: {userID: userID, options: options},
                success: success,
                error: error
            });
        },

        getFeed: function (userID, options, success, error) {
            options = JSON.stringify(options);
            return request('getFeed', {
                params: {userID: userID, options: options},
                success: success,
                error: error
            });
        },

        // For now companyID is null will assume that the company is whoever you're logged in to
        getSenderStats: function (companyID, options, success, error) {
            options = JSON.stringify(options);
            return request('getSenderStats', {
                params: {companyID: companyID, options: options},
                success: success,
                error: error
            });
        },

        getSupportDetails: function (companyID, options, success, error) {
            options = JSON.stringify(options);
            return request('getSupportDetails', {
                params: {companyID: companyID, options: options},
                success: success,
                error: error
            });
        },

        getBillingAlerts: function (companyID, success, error) {
            return request('getBillingAlerts', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        getCompanyTickets: function (companyID, options, success, error) {
            options = JSON.stringify(options);
            return request('getCompanyTickets', {
                params: {companyID: companyID, options: options},
                success: success,
                error: error
            });
        },

        searchSupportArticles: function (searchString, success, error) {
            var url = 'searchSupportArticles';
            if (searchString !== undefined) {
                url += '?search=' + encodeURIComponent(searchString);
            }
            return request(url, {
                success: success,
                error: error
            });
        },

        getCompanySetupInfo: function (companyID, success, error) {
            return request('getCompanySetupInfo', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        setCompanySetupInfo: function (companyID, resetNotifications, companySetupInfo, success, error) {
            return request('setCompanySetupInfo', {
                params: {companyID: companyID, resetNotifications: resetNotifications, companySetupInfo: companySetupInfo},
                success: success,
                error: error
            });
        },

        setLastChargeDate: function (companyID, planID, lastChargeDate, success, error) {
            return request('setLastChargeDate', {
                params: {companyID: companyID, planID: planID, lastChargeDate: lastChargeDate},
                success: success,
                error: error
            });
        },

        getMergeVariables: function (success, error) {
            return request('getMergeVariables', {
                success: success,
                error: error
            });
        },

        getBillingInfo: function (success, error) {
            return request('getBillingInfo', {
                success: success,
                error: error
            });
        },

        setBillingInfo: function (billingInfo, success, error) {
            billingInfo = JSON.stringify(billingInfo);
            return request('setBillingInfo', {
                params: {billingInfo: billingInfo},
                success: success,
                error: error
            });
        },

        calculatePricing: function (companyID, count, success, error) {
            return request('calculatePricing', {
                params: {companyID: companyID, count: count},
                success: success,
                error: error,
                loading: 1
            });
        },

        setBillingCredit: function (companyID, creditID, creditAmount, creditBalance, spread, note, success, error) {
            return request('setBillingCredit', {
                params: {companyID: companyID, creditID: creditID, creditAmount: creditAmount, creditBalance: creditBalance, spread: spread, note: note},
                success: success,
                error: error,
                loading: 1
            });
        },

        createNewClient: function (company, success, error) {
            return request('createNewClient', {
                params: company,
                success: success,
                error: error,
                loading: 1
            });
        },

        setClientEmailLimits: function (limits, success, error) {
            limits = JSON.stringify(limits);
            return request('setClientEmailLimits', {
                params: {limits: limits},
                success: success,
                error: error
            });
        },

        issueRefund: function (companyID, transactionID, amount, reason, success, error) {
            return request('issueRefund', {
                params: {companyID: companyID, transactionID: transactionID, amount: amount, reason: reason},
                success: success,
                error: error
            });
        },

        toggleProductOffering: function (companyID, success, error) {
            return request('toggleProductOffering', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        toggleIsReseller: function (companyID, isReseller, success, error) {
            return request('toggleIsReseller', {
                params: {companyID: companyID, isReseller: isReseller},
                success: success,
                error: error
            });
        },

        getTerminationData: function (month, success, error) {
            return request('getTerminationData', {
                params: {month: month},
                success: success,
                error: error
            });
        },

        getCountryPartner: function (countryPartnerID, success, error) {
            return request('getCountryPartner', {
                params: {countryPartnerID: countryPartnerID},
                success: success,
                error: error,
                loading: 1
            });
        },

        getResellerPlanData: function (companyID, success, error) {
            return request('getResellerPlanData', {
                params: {companyID: companyID},
                success: success,
                error: error
            });
        },

        setClientESPPlan: function (
            companyID,
            isCustomPlan,
            isContactPlan,
            sendPlanID,
            emailLimit,
            leadLimit,
            monthlyPayment,
            accountManager,
            salesAssociate,
            countryPartner,
            note,
            success,
            error
        ) {
            return request('setClientESPPlan',  {
                params: {
                    companyID: companyID,
                    isCustomPlan: isCustomPlan,
                    isContactPlan: isContactPlan,
                    sendPlanID: sendPlanID,
                    emailLimit: emailLimit,
                    leadLimit: leadLimit,
                    monthlyPayment: monthlyPayment,
                    accountManager: accountManager,
                    salesAssociate: salesAssociate,
                    countryPartner: countryPartner,
                    note: note
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setCountryPartner: function (
            countryPartnerID,
            country,
            countryPartnerName,
            companyProfileID,
            initialCommission,
            commissionAfter12Months,
            certificationDate,
            paymentProcessor,
            providerReference,
            providerUsername,
            providerPassword,
            supportContactName,
            supportContactPhone,
            supportContactEmail,
            supportLink,
            sendPlans,
            contactPlanTiers,
            currency,
            success,
            error
        ) {
            return request('setCountryPartner', {
                params: {
                    countryPartnerID: countryPartnerID,
                    country: country,
                    countryPartnerName: countryPartnerName,
                    companyProfileID: companyProfileID,
                    initialCommission: initialCommission,
                    commissionAfter12Months: commissionAfter12Months,
                    certificationDate: certificationDate,
                    paymentProcessor: paymentProcessor,
                    providerReference: providerReference,
                    providerUsername: providerUsername,
                    providerPassword: providerPassword,
                    supportContactName: supportContactName,
                    supportContactPhone: supportContactPhone,
                    supportContactEmail: supportContactEmail,
                    supportLink: supportLink,
                    sendPlans: sendPlans,
                    contactPlanTiers: contactPlanTiers,
                    currency: currency
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        setResellerPlan: function (companyID, setupAutomationPlan, setupEspPlan, plan, credit, tiers, scheduledCharges, companySetupInfo, success, error) {
            return request('setResellerPlan', {
                params: {
                    companyID: companyID,
                    setupAutomationPlan: setupAutomationPlan,
                    setupEspPlan: setupEspPlan,
                    plan: plan,
                    credit: credit,
                    tiers: tiers,
                    scheduledCharges: scheduledCharges,
                    companySetupInfo: companySetupInfo
                },
                success: success,
                error: error,
                loading: 1
            });
        },

        deleteCountryPartnerPlanTier: function (countryPartnerID, tierID, success, error) {
            return request('deleteCountryPartnerPlanTier', {
                params: {countryPartnerID: countryPartnerID, tierID: tierID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setBillingPlan: function (planID, isContactPlan, success, error) {
            return request('setBillingPlan', {
                params: {planID: planID, isContactPlan: isContactPlan},
                success: success,
                error: error
            });
        },

        runToolboxScript: function (script, inputs, success, error) {
            return request('runToolboxScript', {
                params: {script: script, inputs: inputs},
                success: success,
                error: error,
                loading: 1
            });
        },

        getPendingQueueStats: function (companyID, itemID, success, error) {
            return request('getPendingQueueStats/' + companyID + '/' + itemID, {
                success: success,
                error: error
            });
        },

        // Country Partner API
        setIsSendingDisabledForCountryPartnerClient: function (clientID, isSendingDisabled, success, error) {
            return request('setIsSendingDisabledForCountryPartnerClient', {
                params: {clientID: clientID, isSendingDisabled: isSendingDisabled},
                success: success,
                error: error
            });
        },

        getClientChargesByMonth: function (month, year, offset, limit, success, error) {
            return request('getClientChargesByMonth', {
                params: {month: month, year: year, limit: limit, offset: JSON.stringify(offset)},
                success: success,
                error: error,
                loading: 1
            });
        },

        getManagedByCompaniesMetrics: function (resellerID, success, error) {
            return request('getManagedByCompaniesMetrics', {
                params: {resellerID: resellerID},
                success: success,
                error: error,
                loading: 1
            });
        },

        setPipelineDefault: function (pipeline, success, error) {
            return request('setPipelineDefault', {
                params: {pipelineID: pipeline},
                success: success,
                error: error,
                loading: 1
            });
        },

        shutterstockSearch: function (params, success, error) {
            return request('shutterstockSearch', {
                params: params,
                success: success,
                error: error,
                loading: 1
            });
        },

        getShutterstockCategories: function (success, error) {
            return request('getShutterstockCategories', {
                success: success,
                error: error,
                loading: 1
            });
        },

        getShutterstockUser: function (success, error) {
            return request('getShutterstockUser', {
                success: success,
                error: error,
                loading: 1
            });
        },

        getShutterstockPricing: function (success, error) {
            return request('getShutterstockPricing', {
                success: success,
                error: error,
                loading: 1
            });
        },

        shutterstockLogout: function (success, error) {
            return request('shutterstockLogout', {
                success: success,
                error: error,
                loading: 1
            });
        }
    };

    window.api = api;
})(window);
