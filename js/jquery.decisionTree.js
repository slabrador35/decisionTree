/*
 * Decision Tree jQuery plugin.
 * Author: Dan Smith, 2015 (http://www.dbswebdev.com/)
 * Version: 1.0.0
 */
(function($) {

    $.decisionTree = function(element, options) {

        // default options
        var defaults = {

            data_folder: '', // folder to locate JSON files, default is the same folder as the HTML page
            node_prefix: 'dtn', // prefix for question nodes
            json_ext: 'json', // file extension for JSON requests
            cache_json: true, // cache JSON responses
            loading_text: 'Loading...', // text for the 'Loading' overlay
            loading_gif: "/decisionTree/img/loading.gif", // location of the 'progress' animated GIF
            animation_speed: 600, // speed of transitions and effects
            question_extra_text: true, // show additional copy on node questions
            hide_original_content: true, // hide the content used to introduce the decision tree
            answer_link: true, // make the headline of answer nodes a link
            answer_target: "_blank" // target for the answer node link

        }

        // using "plugin" to reference the current instance of the object
        var plugin = this;

        plugin.settings = {}

        var $element = $(element), // reference to the jQuery version of DOM element
             element = element;    // reference to the actual DOM element

        // the "constructor" method that gets called when the object is created
        plugin.init = function() {

            // the plugin's final properties are the merged default and
            // user-provided options (if any)
            plugin.settings = $.extend({}, defaults, options);

            // first thing we need to do is create our 'loading' div, if it doesn't already exist
            if (!document.getElementById("decision-tree-loading")) {

                var loadingDiv = document.createElement("div"),
                    loadingPara = document.createElement("p"),
                    loadingParaText = document.createTextNode(plugin.settings.loading_text),
                    loadingBreak = document.createElement("br"),
                    loadingImage = document.createElement("img");

                loadingDiv.id = "decision-tree-loading";
                loadingImage.setAttribute("src", plugin.settings.loading_gif);

                loadingPara.appendChild(loadingImage);
                loadingPara.appendChild(loadingBreak);
                loadingPara.appendChild(loadingParaText);

                loadingDiv.appendChild(loadingPara);

                document.body.appendChild(loadingDiv);

            }

            // show / hide the 'loading' overlay for ajax calls
            $(document)
                .ajaxStart(function () {
                    $("#decision-tree-loading").show(plugin.settings.animation_speed);

                })
                .ajaxStop(function () {
                    $("#decision-tree-loading").hide(plugin.settings.animation_speed);
                });

        }

        plugin.init();

    }

    // add the plugin to the jQuery.fn object
    $.fn.decisionTree = function(options) {

        // iterate through the elements we're attaching the plugin to
        return this.each(function() {

            // if plugin has not already been attached to the element
            if (undefined == $(this).data('decisionTree')) {

                // create a new instance of the plugin
                // pass the DOM element and the user-provided options as arguments
                var plugin = new $.decisionTree(this, options);

                // store a reference to the plugin object
                $(this).data('decisionTree', plugin);

            }

            // get the start node name fron the anchor, build the path to
            // the start node and populate the first element of the chain
            var startNode = $(this).find(".cta a").attr("data-start-node"),
                startPath = plugin.settings.data_folder + startNode + "." + plugin.settings.json_ext,
                theChain = [startNode];


            // attach an event hadler to the anchor
            $(this).find(".cta a").on("click", function(e) {

                var questionHolder = $(this).parent().parent();

                e.preventDefault();

                //console.log(getNodeID());

                // are we hiding the original content?
                if (plugin.settings.hide_original_content) {

                    // remove all the initial content
                    $(questionHolder).children().slideUp(plugin.settings.animation_speed, function() {
                        $(this).remove();
                    });

                // we're keeping the content
                } else {

                    // so remove the event handler from the CTA...
                    $(this).off();

                    // add a class to the cta paragraph for styling
                    $(this).parent().addClass("clicked");

                    // and add a 'reset' handler...
                    $(this).on("click", function(ev) {

                        ev.preventDefault();

                        // ...that removes the nodes that aren't the 'start' node
                        while (startNode !== theChain[theChain.length - 1]) {

                            var notNeeded = theChain.pop();

                            $("#" + notNeeded).slideDown(plugin.settings.animation_speed, function(next) {
                                $("#" + notNeeded).remove();

                            });

                        }

                        // finally, remove the 'ticked' class from the list item and the 'active' class from the node
                        $("#" + theChain[0] + " ul li").removeClass("ticked");
                        $("#" + theChain[0]).removeClass("done").addClass("active");

                    });

                }

                // get the JSON start node
                $.ajax(startPath, {
                    cache: plugin.settings.cache_json,
                    success: function(data) {

                        var startDiv,
                            startQuestions = "",
                            question_text = "";

                        // if we're looking for extra text and we have some
                        if (plugin.settings.question_extra_text && data.description !== undefined) question_text = "<p>" + data.description + "</p>";

                        // loop through the answers in the node
                        for (var i = 0, ii = data.answers.length; i < ii; i++) {

                            // create a list item for the answer
                            startQuestions += "<li><a href='#" + data.answers[i].target + "' aria-selected='false'>" + data.answers[i].text + "</li>";

                        }

                        // add the question div to the holder div
                        $(questionHolder).prepend("<div id='" + theChain[0] + "' class='startNode dtNode active'><h3>" + data.question + "</h3>" + question_text + "<ul>" + startQuestions + "</ul></div>");

                    },
                    error: function() {
                        alert("Couldn't retrieve data file: " + startPath);
                    }
                });

                // event handler for clicks on the node questions
                $(questionHolder).on("click", "ul li a", function(e) {

                    e.preventDefault();

                    // build the url for the next node JSON file
                    var jsonPath = $(this).attr("href").substring(1),
                        nodeID = getNodeID(),
                        endNode,
                        questionMatch = RegExp("\^" + plugin.settings.node_prefix + ".*"),
                        nodeLocation,
                        activeNode = $(this).closest(".dtNode").attr("id"),
                        answer_image,
                        answer_title;

                    // does this node match our node prefix?
                    endNode = jsonPath.match(questionMatch);

                    // remove the 'ticked' class from all li's, just in case this isn't the last node in the chain
                    $(this).closest(".dtNode").find("ul li").removeClass("ticked");
                    // and ARIA on the anchor
                    $(this).closest(".dtNode").find("ul li a").attr("aria-selected", "false");
                    // and add the 'ticked' class to the li that's been clicked
                    $(this).closest("li").addClass("ticked");
                    // and ARIA on the anchor
                    $(this).attr("aria-selected", "true");
                    // add 'done' and remove 'active' classes from our parent node
                    $(this).closest(".dtNode").addClass("done").removeClass("active");

                    // remove any nodes that exist in theChain after this one
                    while (activeNode !== theChain[theChain.length - 1]) {

                        var notNeeded = theChain.pop();

                        $("#" + notNeeded).slideDown(plugin.settings.animation_speed, function(next) {
                            $("#" + notNeeded).remove();
                        });

                    }

                    // build the path to the question node JSON file
                    jsonPath = plugin.settings.data_folder + jsonPath + "." + plugin.settings.json_ext;

                    // request the node JSON file
                    $.ajax(jsonPath, {
                        cache: plugin.settings.cache_json,
                        success: function(data) {

                            var dtQuestions = "",
                                question_text = "";

                            // add this node to the chain
                            theChain.push(nodeID);

                            // if this isn't an answer node
                            if (endNode !== null) {

                                // if we're looking for extra text and we find some
                                if (plugin.settings.question_extra_text && data.description !== undefined) question_text = "<p>" + data.description + "</p>";

                                // loop through the answers...
                                for (var i = 0, ii = data.answers.length; i < ii; i++) {

                                    // ...creating a new li for each answer
                                    dtQuestions += "<li><a href='#" + data.answers[i].target + "' aria-selected='false'>" + data.answers[i].text + "</li>";

                                }

                                // add the question node to the start of the holder div
                                $(questionHolder).prepend("<div id='" + theChain[theChain.length - 1] + "' class='dtNode active'><h3>" + data.question + "</h3>" + question_text + "<ul>" + dtQuestions + "</ul></div>");
                                //$(questionHolder).prepend("<div class='" + theChain[theChain.length - 1] + " dtNode active'><h3>" + data.question + "</h3>" + question_text + "<ul>" + dtQuestions + "</ul></div>");




                            // this is an answer node
                            } else {

                                // if we have an image and link for the answer node and we want to use the link
                                if (data.image !== undefined && plugin.settings.answer_link && data.link !== undefined) {
                                    answer_image = "<p><a href='" + data.link + "' target='" + plugin.settings.answer_target + "'><img src='" + data.image + "'></a></p>";
                                // or if we just have an image
                                } else if (data.image !== undefined) {
                                    answer_image = "<p><img src='" + data.image + "'></p>";
                                // or if we don't have an image or link
                                } else {
                                    answer_image = "";
                                }

                                // if we have link that we want to use
                                if (data.link !== undefined && plugin.settings.answer_link) {
                                    answer_title = "<h3><a href='" + data.link + "' target='" + plugin.settings.answer_target + "'>" + data.title + "</a></h3>";
                                // or we just have the title
                                } else {
                                    answer_title = "<h3>" + data.title + "</h3>";
                                }

                                // add the answer node to the start of the holder div
                                $(questionHolder).prepend("<div id='" + theChain[theChain.length - 1] + "' class='dtNode answerNode'>" + answer_title + answer_image + data.description + "</div>");
                                //$(questionHolder).prepend("<div class='" + theChain[theChain.length - 1] + " dtNode answerNode'>" + answer_title + answer_image + data.description + "</div>");

                            }

                            // and show the new div
                            $(questionHolder).find("#" + theChain[theChain.length - 1]).hide().slideDown(plugin.settings.animation_speed);


                        },
                        error: function() {
                            alert("Couldn't retrieve data file: " + jsonPath);
                        }
                    });

                });

            });

            // generate a (pretty much) unique ID for the node
            var getNodeID = function() {
                var nodeID = Date.now().toString().substr(5);
                nodeID = "dtn-" + nodeID;
                return nodeID;
            }

        });



    }

})(jQuery);
