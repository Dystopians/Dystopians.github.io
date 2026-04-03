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
  - src: /images/logos/tiktok.svg
    alt: TikTok
    href: https://www.tiktok.com/
    variant: default
---
{% include base_path %}
<h2 id="about">About</h2>



I am a master student researcher focused on computer vision (CV), large language models (LLMs), and multimodal generation. At USC’s [Graphics & Vision Lab](https://usc-gvl.github.io/) (advisor: [Prof. Yue Wang](https://yuewang.xyz/)), my work centers on 3D reconstruction under sparse observations, controllable generative rendering, and embodied navigation. 

On June 8, 2026, I will join TikTok as a Machine Learning Engineer.

<div class="about-card-grid">
  <details class="about-card">
    <summary>
      <span class="about-card__eyebrow">Research Vision</span>
      <span class="about-card__title">Perception, generation, and grounded world models</span>
    </summary>
    <div class="about-card__body">
      <p>More broadly, my research is driven by a simple goal: to enable models that both <strong>perceive</strong> and <strong>generate</strong> the real world in a scalable, physically grounded way. From structured 3D reconstruction during my undergraduate years at Wuhan University to my current work on large language models, world models, and embodied agents at USC, a recurring theme has been bridging raw sensory data with structured representations of scenes, actions, and goals.</p>
      <p>I am especially interested in unified models of perception and generation for lifelong scene understanding and robust, context-aware agents.</p>
    </div>
  </details>

  <details class="about-card">
    <summary>
      <span class="about-card__eyebrow">Selected Projects</span>
      <span class="about-card__title">Security, personalization, and long-horizon simulation</span>
    </summary>
    <div class="about-card__body">
      <p>I carried out two research projects of great personal significance at <a href="https://viterbi-web.usc.edu/~yzhao010/index.html">Prof. Yue Zhao</a>'s <a href="https://viterbi-web.usc.edu/~yzhao010/lab">FORTIS Lab</a>: <a href="https://caipeilin.com/SecDOOD/">SecDOOD (ICCV 2025 Poster)</a> and <a href="https://github.com/PERSONA-bench/PERSONA">PERSONABENCH (NeurIPS 2025 MTI-LLM Spotlight)</a>. The former proposed a secure on-device OOD detection framework that requires no gradient backpropagation, while the latter introduced the first benchmark for evaluating the personalization capabilities of LLMs in multi-turn conversational settings.</p>
      <p>At GVL, I developed <strong>The Earth Simulator</strong>, a street-view world model that turns a handful of raw, pose-free images into long-horizon, camera-controllable exploration videos grounded in 3D geometry. By combining a persistent 3D Gaussian spatial memory with a generative video model, we aim to preserve real-world structure while achieving photorealistic, temporally stable rollouts from sparse, in-the-wild driving footage.</p>
    </div>
  </details>

  <details class="about-card">
    <summary>
      <span class="about-card__eyebrow">Experience</span>
      <span class="about-card__title">Engineering depth, research breadth, and collaboration</span>
    </summary>
    <div class="about-card__body">
      <p>I have strong coding skills and a solid background in computer vision and natural language processing, along with extensive experience training, deploying, and running inference with LLMs and VLMs. I am also continuing to strengthen my research skills in robotics at the GVL Lab.</p>
      <p>If you are interested in collaborating, please feel free to reach out. My preferred email is <a href="mailto:peilinca@usc.edu">peilinca@usc.edu</a>.</p>
    </div>
  </details>
</div>


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
<div class="cv-link-grid">
  <a class="cv-link-card" href="{{ '/CV/Peilin_Cai_CV_en.pdf' | relative_url }}" target="_blank" rel="noopener">
    <span class="cv-link-card__eyebrow">Curriculum Vitae</span>
    <span class="cv-link-card__title">English CV</span>
  </a>
  <a class="cv-link-card" href="{{ '/CV/Peilin_Cai_CV_cn.pdf' | relative_url }}" target="_blank" rel="noopener">
    <span class="cv-link-card__eyebrow">Resume</span>
    <span class="cv-link-card__title">中文简历</span>
  </a>
</div>
  
<!-- ### Service and leadership -->
