---
permalink: /
title: "Peilin Cai's Personal Website"
excerpt: "Last Updated on Sept. 19th"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
title_logos:
  - src: /images/logos/wuhan-university.png
    alt: Wuhan University
    href: https://www.whu.edu.cn/
    variant: seal
  - src: /images/logos/TheSeal_Reg_0921.png
    alt: University of Southern California
    href: https://www.usc.edu/
    variant: seal
  - src: /images/logos/tiktok-logo_1080029-103.avif
    alt: TikTok
    href: https://www.tiktok.com/
    variant: default
---
{% include base_path %}
<h2 id="about">About</h2>



I am a master student researcher focused on computer vision (CV), large language models (LLMs), and multimodal generation. At USC’s [Graphics & Vision Lab](https://usc-gvl.github.io/) (advisor: [Prof. Yue Wang](https://yuewang.xyz/)), my work centers on 3D reconstruction under sparse observations, controllable generative rendering, and embodied navigation. On June 8, 2026, I will join TikTok as a Machine Learning Engineer.

More broadly, my research is driven by a simple goal: to enable models that both **perceive** and **generate** the real world in a scalable, physically grounded way. From structured 3D reconstruction during my undergraduate years at Wuhan University to my current work on large language models, world models, and embodied agents at USC, a recurring theme has been bridging raw sensory data with structured representations of scenes, actions, and goals. I am especially interested in unified models of perception and generation for lifelong scene understanding and robust, context-aware agents.

I carried out two research projects of great personal significance at [Prof. Yue Zhao](https://viterbi-web.usc.edu/~yzhao010/index.html)’s [FORTIS Lab](https://viterbi-web.usc.edu/~yzhao010/lab): [SecDOOD (ICCV 2025 Poster)](https://caipeilin.com/SecDOOD/) and [PERSONABENCH (NeurIPS 2025 MTI-LLM Spotlight)](https://github.com/PERSONA-bench/PERSONA). The former proposed a secure on-device OOD detection framework that requires no gradient backpropagation, offering insights for deploying personalized large models on edge devices; the latter introduced the first benchmark for evaluating the personalization capabilities of LLMs in multi-turn conversational settings. I am deeply grateful to Prof. Yue Zhao and the senior PhD students in the lab for their support.

At GVL, I developed **The Earth Simulator**, a street-view world model that turns a handful of raw, pose-free images into long-horizon, camera-controllable exploration videos grounded in 3D geometry. By combining a persistent 3D Gaussian spatial memory with a generative video model, we aim to preserve real-world structure while achieving photorealistic, temporally stable rollouts from sparse, in-the-wild driving footage rather than costly calibrated data collection. Source code and preprints are on the way!

I have strong coding skills and a solid background in computer vision and natural language processing, as well as extensive experience in training, deploying, and running inference with LLMs / VLMs. And I am also honing my research skills in robotics at the GVL Lab. If you are interested in collaborating, please feel free to reach out. My preferred email is [peilinca@usc.edu](peilinca@usc.edu)

### Current State:
- In my third semester of the M.S. in Computer Science program at the University of Southern California. 
- Currently working on two projects that will be submitted for publication.
- Joining TikTok as a Machine Learning Engineer on June 8, 2026.


<hr />

<h2 id="publications">Publications</h2>

<!-- New style rendering if publication categories are defined -->
{% for post in site.publications reversed %}
  {% include archive-single-publication.html %}
{% endfor %}

<hr />

{% comment %}
Talks, Teaching, Portfolio, and Blog sections temporarily disabled.
{% endcomment %}

<h2 id="cv">CV</h2>
<div class="cv-button-group" style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0;">
  <a class="btn btn--primary btn--large" href="{{ '/CV/Peilin_Cai_CV_en.pdf' | relative_url }}" target="_blank" rel="noopener">English CV</a>
  <a class="btn btn--primary btn--large" href="{{ '/CV/Peilin_Cai_CV_cn.pdf' | relative_url }}" target="_blank" rel="noopener">中文简历</a>
</div>
  
<!-- ### Service and leadership -->
