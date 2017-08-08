
function init_pro()
{
	 $(".pro-package").click(function() {
           var className =  $(this).attr('class');
		   if ($(this).parent().attr('class').indexOf('opened') == -1) {	 
			 $(this).parent().addClass('opened');
			 $('.pro-divider').first().attr('class', 'pro-divider-opened');
			 $('.pro-pricing-block').addClass('opened');
		   }
		   if (className.indexOf('selected') == -1) {
				$(".pro-package").removeClass('selected');	
			    $(this).addClass('selected');
			}
         });
		 $(".pro-pricing").click(function() {
           var className =  $(this).attr('class');
		   if ($('.pro-payment-block').attr('class').indexOf('opened') == -1) {
			 $(this).parent().addClass('opened');	 
			 $('.pro-divider').first().attr('class', 'pro-divider-opened');
			 $('.pro-payment-block').addClass('opened');
		   }
		   if (className.indexOf('selected') == -1) {
				$(".pro-pricing").removeClass('selected');	
			    $(this).addClass('selected');
			}
         });
		 $(".pro-payment").click(function() {
           var className =  $(this).attr('class');
		   if ($('.pro-button-block').attr('class').indexOf('opened') == -1) {
			 $(this).parent().addClass('opened');	 
			 $('.pro-divider').first().attr('class', 'pro-divider-opened');
			 $('.pro-button-block').addClass('opened');
		   }
			if (className.indexOf('selected') == -1) {
				$(".pro-payment").removeClass('selected');	
			    $(this).addClass('selected');
			}
         });
		 $(".pro-payment-type").click(function() {
           var className =  $(this).attr('class');
			if (className.indexOf('selected') == -1) {
				$(".pro-payment-type").removeClass('selected');	
			    $(this).addClass('selected');
			}
         });
	 

}