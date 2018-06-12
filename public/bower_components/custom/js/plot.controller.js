$(document).ready(() => {
	const query = {
		Selecione: ["Selecione"],
		Facebook: ["Selecione", "Curtidas", "Seguidores"],
		Twitter: ["Selecione", "Curtidas", "Seguidores", "Seguindo", "Tweets"],
		Instagram: ["Selecione", "Seguidores", "Seguindo", "Posts"],
		Youtube: ["Selecione", "Inscritos", "Videos"],
	};

	$query = $("#query option");

	$("#digitalMedia").on("change", function (event) {
		const digitalMedia = this.value;

		$query.each((index, el) => {
			if (query[digitalMedia].indexOf(el.value) == -1)
				{$(el).prop("disabled", true); } else { $(el).prop("disabled", false); }
		});

		
	}).change();
	// */
});

$(document).ready(() => {
	$("button").click(() => {
		// $("#test").hide();
		$.get("qualquer", (data, status) => {
			alert("texto: " + data.texto + "\nStatus: " + data.statusCod);
		});
	});
});

