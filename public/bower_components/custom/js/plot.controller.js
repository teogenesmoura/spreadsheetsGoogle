$(document).ready(function(){
	$("button").click(function(){
		$("#test").hide();
	});
	//*
	var query = {
		Selecione: ["Selecione"],
		Facebook: ["Selecione", "Curtidas", "Seguidores"],
		Twitter: ["Selecione", "Curtidas", "Seguidores", "Seguindo", "Tweets"],
		Instagram: ["Selecione", "Seguidores", "Seguindo", "Posts"],
		Youtube: ["Selecione", "Inscritos", "Videos"]
	};

	$query = $("#query option");

	$("#digitalMedia").on("change", function(event){
		var digitalMedia = this.value;

		$query.each(function(index, el){
			if (query[digitalMedia].indexOf(el.value) == -1)
				$(el).prop("disabled", true);
			else
				$(el).prop("disabled", false);
		});
	}).change();
	// */
});
